import { useState, useEffect, ChangeEvent } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, GripVertical, Video, FileText, Loader2, UploadCloud, Paperclip } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Placeholder types - replace with actual Prisma types later
type Lesson = {
  id: number;
  title: string;
  position: number;
  content?: string | null;
  videoUrl?: string | null;
  duration?: number | null; // Optional duration in seconds
};

type Resource = {
  id: number;
  courseId: number;
  lessonId: number | null;
  uploaderId: number;
  filename: string;
  mimetype: string;
  storagePath: string;
  uploadedAt: string;
  description?: string | null;
};

interface LessonListProps {
  moduleId: number;
}

import { useRef } from 'react';

export function LessonList({ moduleId }: LessonListProps) {
  // Ref for file inputs by lessonId
  const resourceInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // New: Track resources for each lesson
  const [lessonResources, setLessonResources] = useState<Record<number, Resource[]>>({});
  const [resourceLoading, setResourceLoading] = useState<Record<number, boolean>>({});
  const [resourceUploadState, setResourceUploadState] = useState<Record<number, { files: File[]; uploading: boolean }> >({});

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Optional progress tracking

  // State for editing lessons
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonContent, setEditingLessonContent] = useState('');
  const [editingLessonVideoUrl, setEditingLessonVideoUrl] = useState('');

  // Fetch lessons for the module
  useEffect(() => {
    const fetchLessons = async () => {
      if (!moduleId) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/modules/${moduleId}/lessons`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Lesson[] = await response.json();
        setLessons(data.sort((a, b) => a.position - b.position));
      } catch (error) {
        console.error("Failed to fetch lessons:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, [moduleId]);

  // Fetch resources for all lessons in this module
  useEffect(() => {
    const fetchResources = async () => {
      if (!lessons.length) return;
      // Find courseId from first lesson (API requires courseId)
      // In real app, pass courseId as prop or fetch from context
      const courseId = (window as any).currentEditCourseId; // HACK: set this in edit-course page if needed
      if (!courseId) return;
      try {
        const response = await fetch(`/api/courses/${courseId}/resources`);
        if (!response.ok) return;
        const allResources: Resource[] = await response.json();
        // Group by lessonId
        const byLesson: Record<number, Resource[]> = {};
        for (const lesson of lessons) {
          byLesson[lesson.id] = allResources.filter(r => r.lessonId === lesson.id);
        }
        setLessonResources(byLesson);
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      }
    };
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedVideoFile(event.target.files[0]);
      console.log("Selected file:", event.target.files[0].name);
    } else {
      setSelectedVideoFile(null);
    }
  };

  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;

    let uploadedVideoUrl: string | null = null;

    // --- Video Upload Logic ---
    if (selectedVideoFile) {
      setIsUploading(true);
      setUploadProgress(0); // Reset progress
      console.log(`Uploading video: ${selectedVideoFile.name}`);
      try {
        const formData = new FormData();
        formData.append('video', selectedVideoFile); // 'video' must match uploadVideo.single('video') in backend

        // Real API call to upload video
        const uploadResponse = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData,
          // Note: Don't set Content-Type header for FormData, browser does it correctly with boundary
          // Optional: Add progress tracking using XMLHttpRequest if needed
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || `Upload failed with status: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        uploadedVideoUrl = uploadResult.videoUrl; // Get URL from backend response

        if (!uploadedVideoUrl) {
          throw new Error("Backend did not return a video URL after upload.");
        }
        
        console.log(`Video uploaded to: ${uploadedVideoUrl}`);
        setUploadProgress(100); // Mark as complete

      } catch (error) {
        console.error("Failed to upload video:", error);
        alert("Video upload failed. Please try again.");
        setIsUploading(false);
        return; // Stop lesson creation if upload fails
      } finally {
        setIsUploading(false);
      }
    }
    // --- End Video Upload Logic ---

    console.log(`Adding lesson: ${newLessonTitle}`);
    const newPosition = lessons.length > 0 ? Math.max(...lessons.map(l => l.position)) + 1 : 1;
    
    try {
      const lessonPayload = {
        moduleId: moduleId,
        title: newLessonTitle,
        position: newPosition,
        content: newLessonContent || null,
        videoUrl: uploadedVideoUrl, // Use the URL from upload
        // Duration might be calculated/set on backend after video processing
      };

      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newLesson: Lesson = await response.json();
      setLessons([...lessons, newLesson].sort((a, b) => a.position - b.position));
      
      // Reset form
      setNewLessonTitle('');
      setNewLessonContent('');
      setSelectedVideoFile(null);
      setShowAddForm(false);

    } catch (error) {
      console.error("Failed to add lesson:", error);
      // TODO: Add user-facing error handling
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
     if (!confirm('Are you sure you want to delete this lesson?')) return;
     console.log(`Deleting lesson ID: ${lessonId}`);
     try {
       const response = await fetch(`/api/lessons/${lessonId}`, { // Assuming DELETE /api/lessons/:id exists
         method: 'DELETE',
       });
       if (!response.ok) {
          if (response.status !== 204) { 
             throw new Error(`HTTP error! status: ${response.status}`);
          }
       }
       setLessons(lessons.filter(l => l.id !== lessonId));
       // Note: Backend should handle deleting associated video file if necessary
     } catch (error) {
       console.error("Failed to delete lesson:", error);
      // TODO: Add user-facing error handling
     }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditingLessonTitle(lesson.title);
    setEditingLessonContent(lesson.content || '');
    setEditingLessonVideoUrl(lesson.videoUrl || '');
  };

  const handleSaveLessonEdit = async (lessonId: number) => {
    if (!editingLessonTitle.trim()) return;
    console.log(`Saving edit for lesson ID ${lessonId}`);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingLessonTitle,
          content: editingLessonContent,
          videoUrl: editingLessonVideoUrl,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const updatedLesson: Lesson = await response.json();
      setLessons(lessons.map(l => l.id === lessonId ? updatedLesson : l).sort((a, b) => a.position - b.position));
      setEditingLessonId(null);
      setEditingLessonTitle('');
      setEditingLessonContent('');
      setEditingLessonVideoUrl('');
    } catch (error) {
      console.error("Failed to save lesson edit:", error);
    }
  };

  // TODO: Implement drag-and-drop reordering

  // Resource upload handler for a lesson (multiple files)
  const handleResourceFileChange = (lessonId: number, files: File[] | null) => {
    setResourceUploadState((prev) => ({
      ...prev,
      [lessonId]: { files: files || [], uploading: false },
    }));
  };

  const handleResourceUpload = async (lesson: Lesson) => {
    const state = resourceUploadState[lesson.id];
    if (!state || !state.files || state.files.length === 0) return;
    setResourceUploadState((prev) => ({
      ...prev,
      [lesson.id]: { ...prev[lesson.id], uploading: true },
    }));
    try {
      const courseId = (window as any).currentEditCourseId;
      if (!courseId) throw new Error("Course ID not found");
      const uploadedResources: Resource[] = [];
      for (const file of state.files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("courseId", courseId);
        formData.append("lessonId", lesson.id.toString());
        const response = await fetch("/api/resources", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error("Resource upload failed");
        }
        const resource: Resource = await response.json();
        uploadedResources.push(resource);
      }
      setLessonResources((prev) => ({
        ...prev,
        [lesson.id]: [...uploadedResources, ...(prev[lesson.id] || [])],
      }));
      setResourceUploadState((prev) => ({
        ...prev,
        [lesson.id]: { files: [], uploading: false },
      }));
      // Clear the file input
      if (resourceInputRefs.current[lesson.id]) {
        resourceInputRefs.current[lesson.id]!.value = "";
      }
    } catch (error) {
      alert("Resource upload failed");
      setResourceUploadState((prev) => ({
        ...prev,
        [lesson.id]: { ...prev[lesson.id], uploading: false },
      }));
    }
  };

  return (
    <div className="pl-8 mt-3 space-y-3 border-l border-dashed ml-4">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DragDropContext
          onDragEnd={async (result: DropResult) => {
            if (!result.destination) return;
            const reordered = Array.from(lessons);
            const [removed] = reordered.splice(result.source.index, 1);
            reordered.splice(result.destination.index, 0, removed);
            setLessons(reordered);
            try {
              await fetch(`/api/modules/${moduleId}/reorder-lessons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonOrder: reordered.map((l) => l.id) }),
              });
            } catch (error) {
              console.error('Failed to update lesson order:', error);
            }
          }}
        >
          <Droppable droppableId={`lessons-droppable-${moduleId}`}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {lessons.filter(l => l.type !== "assessment").map((lesson, index) => (
                  <Draggable key={lesson.id} draggableId={lesson.id.toString()} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900/50 shadow-sm">
                          <div className="flex items-center gap-3 flex-grow min-w-0">
                            <GripVertical className="h-4 w-4 text-slate-400 cursor-grab flex-shrink-0" />
                            {lesson.videoUrl ? <Video className="h-4 w-4 text-blue-500 flex-shrink-0" /> : <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />}
                            {editingLessonId === lesson.id ? (
                              <Card className="w-full bg-white dark:bg-slate-900/50 shadow-sm">
                                <CardHeader className="p-3">
                                  <CardTitle className="text-base">Edit Lesson</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 space-y-3">
                                  <Input
                                    placeholder="Lesson Title"
                                    value={editingLessonTitle}
                                    onChange={(e) => setEditingLessonTitle(e.target.value)}
                                    className="h-9"
                                  />
                                  <Textarea
                                    placeholder="Lesson content (optional, if not using video)"
                                    value={editingLessonContent}
                                    onChange={(e) => setEditingLessonContent(e.target.value)}
                                    rows={3}
                                  />
                                  <div>
                                    <label className="text-sm font-medium block mb-1.5">Replace Video (Optional)</label>
                                    <div className="flex items-center gap-2">
                                      <label className="flex-grow cursor-pointer border border-dashed rounded-md p-2 text-center text-sm text-slate-500 hover:border-slate-400">
                                        <UploadCloud className="h-5 w-5 mx-auto mb-1 text-slate-400" />
                                        {editingLessonVideoUrl
                              ? editingLessonVideoUrl.split('/').pop()
                              : "Click or drag to upload"}
                                        <Input
                                          type="file"
                                          accept="video/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const formData = new FormData();
                                            formData.append('video', file);
                                            try {
                                              const uploadResponse = await fetch('/api/upload/video', {
                                                method: 'POST',
                                                body: formData,
                                              });
                                              if (!uploadResponse.ok) {
                                                throw new Error('Video upload failed');
                                              }
                                              const uploadResult = await uploadResponse.json();
                                              setEditingLessonVideoUrl(uploadResult.videoUrl);
                                            } catch (error) {
                                              console.error('Video upload error:', error);
                                              alert('Video upload failed');
                                            }
                                          }}
                                        />
                                      </label>
                                      {editingLessonVideoUrl && (
                                        <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => setEditingLessonVideoUrl('')}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingLessonId(null)}>Cancel</Button>
                                    <Button size="sm" onClick={() => handleSaveLessonEdit(lesson.id)}>
                                      Save
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ) : (
                              <span className="text-sm font-medium flex-grow truncate" title={lesson.title}>{lesson.title}</span>
                            )}
                            {lesson.duration && editingLessonId !== lesson.id && (
                              <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{Math.floor(lesson.duration / 60)} min</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {editingLessonId === lesson.id ? (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingLessonId(null)}>Cancel</Button>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditLesson(lesson)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 h-7 w-7" onClick={() => handleDeleteLesson(lesson.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Resource Upload and List Section */}
                        <div className="pl-8 mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Paperclip className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Lesson Resources</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.csv"
                              className="w-auto"
                              multiple
                              ref={el => (resourceInputRefs.current[lesson.id] = el)}
                              onChange={e =>
                                handleResourceFileChange(
                                  lesson.id,
                                  e.target.files ? Array.from(e.target.files) : []
                                )
                              }
                              disabled={resourceUploadState[lesson.id]?.uploading}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleResourceUpload(lesson)}
                              disabled={
                                !resourceUploadState[lesson.id]?.files ||
                                resourceUploadState[lesson.id]?.files.length === 0 ||
                                resourceUploadState[lesson.id]?.uploading
                              }
                            >
                              {resourceUploadState[lesson.id]?.uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UploadCloud className="h-4 w-4" />
                              )}
                              <span className="ml-1">Upload</span>
                            </Button>
                          </div>
                          {/* Show selected files before upload */}
                          {resourceUploadState[lesson.id]?.files &&
                            resourceUploadState[lesson.id]?.files.length > 0 && (
                              <ul className="mb-2 text-xs text-slate-500">
                                {resourceUploadState[lesson.id]?.files.map((file, idx) => (
                                  <li key={idx}>{file.name}</li>
                                ))}
                              </ul>
                            )}
                          {/* List resources for this lesson */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {(lessonResources[lesson.id] || []).length === 0 ? (
                              <div className="text-xs text-slate-400 col-span-full">No resources uploaded for this lesson.</div>
                            ) : (
                              lessonResources[lesson.id].map(resource => (
                                <div key={resource.id} className="flex items-center gap-2 text-xs border rounded-md p-2 bg-slate-50 dark:bg-slate-800/40">
                                  <a
                                    href={`/api/resources/${resource.id}/download`}
                                    className="flex-1 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                    <span className="font-medium">{resource.filename}</span>
                                  </a>
                                  <span className="text-slate-400 ml-2">{new Date(resource.uploadedAt).toLocaleDateString()}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600 h-6 w-6 ml-1"
                                    title="Delete resource"
                                    onClick={async () => {
                                      if (!window.confirm("Are you sure you want to delete this resource?")) return;
                                      try {
                                        const resp = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
                                        if (resp.ok) {
                                          setLessonResources(prev => ({
                                            ...prev,
                                            [lesson.id]: (prev[lesson.id] || []).filter(r => r.id !== resource.id),
                                          }));
                                        } else {
                                          alert("Failed to delete resource");
                                        }
                                      } catch {
                                        alert("Failed to delete resource");
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add New Lesson Form Toggle/Display */}
      {showAddForm ? (
        <Card className="bg-white dark:bg-slate-900/50 shadow-sm mt-3">
          <CardHeader className="p-3">
            <CardTitle className="text-base">Add New Lesson</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <Input 
              placeholder="Lesson Title" 
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              className="h-9"
            />
            <Textarea 
              placeholder="Lesson content (optional, if not using video)"
              value={newLessonContent}
              onChange={(e) => setNewLessonContent(e.target.value)}
              rows={3}
            />
            <div>
              <label className="text-sm font-medium block mb-1.5">Video (Optional)</label>
              <div className="flex items-center gap-2">
                 <label className="flex-grow cursor-pointer border border-dashed rounded-md p-2 text-center text-sm text-slate-500 hover:border-slate-400">
                    <UploadCloud className="h-5 w-5 mx-auto mb-1 text-slate-400" />
                    {selectedVideoFile ? selectedVideoFile.name : 'Click or drag to upload'}
                    <Input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                 </label>
                 {selectedVideoFile && (
                    <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => setSelectedVideoFile(null)}>
                       <Trash2 className="h-4 w-4" />
                    </Button>
                 )}
              </div>
              {isUploading && (
                 <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                       <span>Uploading...</span>
                       <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-1 bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                 </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddLesson} disabled={!newLessonTitle.trim() || isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)} className="w-full justify-start">
          <Plus className="mr-2 h-4 w-4" /> Add Lesson
        </Button>
      )}
    </div>
  );
}

export default LessonList;
