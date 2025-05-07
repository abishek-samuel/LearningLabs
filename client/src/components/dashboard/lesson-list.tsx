import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, GripVertical, Video, FileText, Loader2, UploadCloud, Paperclip,PlayCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from "@/components/ui/alert"; // For showing errors

// --- Types (Keep as is) ---
type Lesson = {
  id: number;
  title: string;
  position: number;
  content?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  type?: string;
};

type Resource = {
  id: number;
  courseId: number;
  lessonId: number | null;
  uploaderId: number; // Assuming you have uploader info if needed
  filename: string;
  mimetype: string;
  storagePath: string;
  uploadedAt: string;
  description?: string | null;
};

interface LessonListProps {
  moduleId: number;
  courseId: number;
}

export function LessonList({ moduleId, courseId }: LessonListProps) {
  const resourceInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // Ref for the new lesson resource file input
  const newLessonResourceInputRef = useRef<HTMLInputElement | null>(null);

  const [lessonResources, setLessonResources] = useState<Record<number, Resource[]>>({});
  const [resourceUploadState, setResourceUploadState] = useState<Record<number, { files: File[]; uploading: boolean; error?: string }>>({});
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // State for resources in the "Add New Lesson" form
  const [newLessonResourceFiles, setNewLessonResourceFiles] = useState<File[]>([]);
  const [isUploadingNewLessonResources, setIsUploadingNewLessonResources] = useState(false);
  const [newLessonResourceError, setNewLessonResourceError] = useState<string | null>(null);


  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonContent, setEditingLessonContent] = useState('');
  const [editingLessonVideoUrl, setEditingLessonVideoUrl] = useState('');
  const [editVideoUploadProgress, setEditVideoUploadProgress] = useState<boolean | number>(false);

  const [error, setError] = useState<string | null>(null);

  // --- Fetch Lessons ---
  useEffect(() => {
    const fetchLessons = async () => {
      if (!moduleId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/modules/${moduleId}/lessons`);
        if (!response.ok) throw new Error(`Failed to load lessons (${response.status})`);
        const data: Lesson[] = await response.json();
        setLessons(data.sort((a, b) => a.position - b.position));
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, [moduleId]);

  // --- Fetch Resources for lessons shown ---
  useEffect(() => {
    const fetchResources = async () => {
      if (!lessons.length || !courseId) return;
      const lessonIds = lessons.map(l => l.id);
      if (lessonIds.length === 0) return;

      try {
        const response = await fetch(`/api/courses/${courseId}/resources?lessonIds=${lessonIds.join(',')}`);
        if (!response.ok) {
           console.warn(`Failed to fetch resources (${response.status}), continuing without them.`);
           setLessonResources({});
           return;
        }
        const allResources: Resource[] = await response.json();
        const byLesson: Record<number, Resource[]> = {};
        for (const lesson of lessons) {
          byLesson[lesson.id] = allResources.filter(r => r.lessonId === lesson.id)
                                          .sort((a, b) => a.filename.localeCompare(b.filename));
        }
        setLessonResources(byLesson);
      } catch (err) {
        console.error("Failed to fetch resources:", err);
      }
    };
    if (lessons.length > 0) {
        fetchResources();
    }
  }, [lessons, courseId]);


  // --- Video File Handling ---
  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedVideoFile(file || null);
  };

  const handleEditVideoFileChange = async (event: ChangeEvent<HTMLInputElement>, lessonId: number) => {
      const file = event.target.files?.[0];
      if (!file || !editingLessonId || editingLessonId !== lessonId) return;

      setEditVideoUploadProgress(true);
      const formData = new FormData();
      formData.append('video', file);

      try {
          const uploadResponse = await fetch('/api/upload/video', { method: 'POST', body: formData });
          if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({ message: 'Video upload failed' }));
              throw new Error(errorData.message || `Upload failed (${uploadResponse.status})`);
          }
          const uploadResult = await uploadResponse.json();
          if (!uploadResult.videoUrl) throw new Error("Video URL missing from response");

          setEditingLessonVideoUrl(uploadResult.videoUrl);
          setEditVideoUploadProgress(false);
      } catch (err) {
          console.error('Video upload error during edit:', err);
          setError(err instanceof Error ? err.message : 'Video upload failed');
          setEditVideoUploadProgress(false);
      }
  };


  // --- Add Lesson ---
  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;
    setError(null);
    setNewLessonResourceError(null); // Clear resource error for new lesson
    let uploadedVideoUrl: string | null = null;

    if (selectedVideoFile) {
      setIsUploadingVideo(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        formData.append('video', selectedVideoFile);
        const uploadResponse = await fetch('/api/upload/video', { method: 'POST', body: formData });
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ message: 'Video upload failed' }));
          throw new Error(errorData.message || `Upload failed: ${uploadResponse.status}`);
        }
        const uploadResult = await uploadResponse.json();
        uploadedVideoUrl = uploadResult.videoUrl;
        if (!uploadedVideoUrl) throw new Error("Backend didn't return video URL.");
        setUploadProgress(100);
      } catch (err) {
        console.error("Failed to upload video:", err);
        setError(err instanceof Error ? err.message : 'Video upload failed');
        setIsUploadingVideo(false);
        return;
      } finally {
        setIsUploadingVideo(false);
      }
    }

    const newPosition = lessons.length > 0 ? Math.max(...lessons.map(l => l.position)) + 1 : 1;
    let newLesson: Lesson | null = null; // Hold new lesson temporarily
    try {
      const lessonPayload = { moduleId, title: newLessonTitle, position: newPosition, content: newLessonContent || null, videoUrl: uploadedVideoUrl };
      const response = await fetch('/api/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lessonPayload) });
      if (!response.ok) throw new Error(`Failed to create lesson (${response.status})`);
      newLesson = await response.json(); // Assign to temp variable

      // Initialize states for the new lesson resources immediately
      setLessonResources(prev => ({ ...prev, [newLesson!.id]: [] }));
      setResourceUploadState(prev => ({ ...prev, [newLesson!.id]: { files: [], uploading: false } }));


      // --- START: Upload resources for the new lesson ---
      if (newLesson && newLessonResourceFiles.length > 0) {
        setIsUploadingNewLessonResources(true);
        const uploadedResourcesForNewLesson: Resource[] = [];
        try {
          for (const file of newLessonResourceFiles) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("courseId", courseId.toString());
            formData.append("lessonId", newLesson.id.toString()); // Use the ID of the just-created lesson
            const resourceResponse = await fetch("/api/resources", { method: "POST", body: formData });
            if (!resourceResponse.ok) {
              const errorData = await resourceResponse.json().catch(() => ({ message: `Upload failed for ${file.name}` }));
              throw new Error(errorData.message || `Upload failed for ${file.name} (${resourceResponse.status})`);
            }
            uploadedResourcesForNewLesson.push(await resourceResponse.json());
          }
          // Update lessonResources state for the new lesson specifically
          setLessonResources(prev => ({
            ...prev,
            [newLesson!.id]: [...(prev[newLesson!.id] || []), ...uploadedResourcesForNewLesson].sort((a, b) => a.filename.localeCompare(b.filename)),
          }));
        } catch (resourceErr) {
            console.error("Error uploading resources for new lesson:", resourceErr);
            setNewLessonResourceError(resourceErr instanceof Error ? resourceErr.message : "Failed to upload some resources.");
            // Note: Lesson is created, but some resources might have failed. User needs to be informed.
            // The main lesson creation won't be rolled back here.
        } finally {
            setIsUploadingNewLessonResources(false);
        }
      }
      // --- END: Upload resources for the new lesson ---

      // Add lesson to UI and reset form *after* potential resource uploads attempt
      setLessons(prevLessons => [...prevLessons, newLesson!].sort((a, b) => a.position - b.position));
      setShowAddForm(false);
      setNewLessonTitle('');
      setNewLessonContent('');
      setSelectedVideoFile(null);
      setNewLessonResourceFiles([]); // Reset selected resource files
      if (newLessonResourceInputRef.current) {
        newLessonResourceInputRef.current.value = ""; // Clear the file input
      }

    } catch (err) {
      console.error("Failed to add lesson:", err);
      setError(err instanceof Error ? err.message : 'Failed to add lesson');
    }
  };

  // --- Resource Handling for "Add New Lesson" Form ---
  const handleNewLessonResourceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files ? Array.from(event.target.files) : [];
    if (newFiles.length > 0) { // Only update if new files were actually selected
      setNewLessonResourceFiles(prevFiles => {
        // Filter out any files that might already be in the list (by name, as File objects are new instances)
        // This prevents adding the exact same file (by name) if selected again.
        const existingFileNames = new Set(prevFiles.map(f => f.name));
        const uniqueNewFiles = newFiles.filter(nf => !existingFileNames.has(nf.name));
        return [...prevFiles, ...uniqueNewFiles];
      });
      setNewLessonResourceError(null); // Clear error when new files are selected
    }
    // Clear the input value so the same file(s) can be selected again if removed and re-added
    if (event.target) {
      event.target.value = "";
    }
  };

  const removeNewLessonResourceFile = (fileNameToRemove: string) => {
    setNewLessonResourceFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
    // No need to directly clear newLessonResourceInputRef.current.value here,
    // as clearing it in handleNewLessonResourceFileChange after processing is better.
  };


  // --- Delete Lesson ---
  const handleDeleteLesson = async (lessonId: number) => {
      if (!confirm('Are you sure you want to delete this lesson and its resources?')) return;
      setError(null);
      try {
        const response = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' });
        if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to delete lesson (${response.status})`);
        }
        setLessons(lessons.filter(l => l.id !== lessonId));
        setLessonResources(prev => { const s = { ...prev }; delete s[lessonId]; return s; });
        setResourceUploadState(prev => { const s = { ...prev }; delete s[lessonId]; return s; });
      } catch (err) {
        console.error("Failed to delete lesson:", err);
        setError(err instanceof Error ? err.message : 'Failed to delete lesson');
      }
  };

  // --- Edit Lesson ---
  const handleEditLesson = (lesson: Lesson) => {
    setError(null);
    setEditingLessonId(lesson.id);
    setEditingLessonTitle(lesson.title);
    setEditingLessonContent(lesson.content || '');
    setEditingLessonVideoUrl(lesson.videoUrl || '');
    setEditVideoUploadProgress(false);
    if (!resourceUploadState[lesson.id]) {
        setResourceUploadState(prev => ({ ...prev, [lesson.id]: { files: [], uploading: false } }));
    }
  };

  const handleCancelEdit = () => {
    setEditingLessonId(null);
  }

  const handleSaveLessonEdit = async (lessonId: number) => {
    if (!editingLessonTitle.trim()) return;
    setError(null);
    try {
      const payload = { title: editingLessonTitle, content: editingLessonContent, videoUrl: editingLessonVideoUrl };
      const response = await fetch(`/api/lessons/${lessonId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`Failed to update lesson (${response.status})`);
      const updatedLesson: Lesson = await response.json();
      setLessons(lessons.map(l => l.id === lessonId ? { ...l, ...updatedLesson } : l)
                        .sort((a, b) => a.position - b.position));
      handleCancelEdit();
    } catch (err) {
      console.error("Failed to save lesson edit:", err);
      setError(err instanceof Error ? err.message : 'Failed to save lesson');
    }
  };

  // --- Drag and Drop Reorder ---
  const handleDragEnd = async (result: DropResult) => {
      if (!result.destination || result.source.index === result.destination.index) return;
      setError(null);
      const reordered = Array.from(lessons);
      const [removed] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, removed);

      const updatedLessons = reordered.map((lesson, index) => ({ ...lesson, position: index + 1 }));
      setLessons(updatedLessons);

      try {
          const response = await fetch(`/api/modules/${moduleId}/reorder-lessons`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lessonOrder: updatedLessons.map((l) => l.id) }),
          });
          if (!response.ok) {
              setLessons(lessons);
              throw new Error(`Failed to reorder lessons (${response.status})`);
          }
      } catch (err) {
          console.error('Failed to update lesson order:', err);
          setError(err instanceof Error ? err.message : 'Failed to save lesson order');
          setLessons(lessons);
      }
  };


  // --- Resource Handling (Upload/Delete) for EDITING LESSON ---
  const handleResourceFileChange = (lessonId: number, event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setResourceUploadState((prev) => ({
      ...prev,
      [lessonId]: { ...(prev[lessonId] || {}), files: files, uploading: false, error: undefined },
    }));
  };

  const handleResourceUpload = async (lesson: Lesson) => {
    const state = resourceUploadState[lesson.id];
    if (!state || !state.files || state.files.length === 0 || state.uploading) return;
    const lessonId = lesson.id;

    setResourceUploadState((prev) => ({ ...prev, [lessonId]: { ...prev[lessonId], uploading: true, error: undefined } }));

    try {
      if (!courseId) throw new Error("Course ID is missing");
      const uploadedResources: Resource[] = [];
      for (const file of state.files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("courseId", courseId.toString());
        formData.append("lessonId", lessonId.toString());
        const response = await fetch("/api/resources", { method: "POST", body: formData });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Upload failed for ${file.name}` }));
          throw new Error(errorData.message || `Upload failed (${response.status})`);
        }
        uploadedResources.push(await response.json());
      }

      setLessonResources((prev) => ({
        ...prev,
        [lessonId]: [...(prev[lessonId] || []), ...uploadedResources].sort((a, b) => a.filename.localeCompare(b.filename)),
      }));

      if (resourceInputRefs.current[lessonId]) {
        resourceInputRefs.current[lessonId]!.value = "";
      }
      setResourceUploadState((prev) => ({ ...prev, [lessonId]: { files: [], uploading: false } }));

    } catch (err) {
      console.error("Failed to upload resources:", err);
      setResourceUploadState((prev) => ({
        ...prev,
        [lessonId]: { ...(prev[lessonId] || { files: [], uploading: false }), uploading: false, error: err instanceof Error ? err.message : 'Upload failed' },
      }));
    }
  };

  const handleDeleteResource = async (resourceId: number, lessonId: number) => {
      if (!window.confirm("Delete this resource?")) return;
      setResourceUploadState(prev => ({...prev, [lessonId]: {...(prev[lessonId] || { files: [], uploading: false }), error: undefined }}));

      try {
          const resp = await fetch(`/api/resources/${resourceId}`, { method: "DELETE" });
          if (!resp.ok && resp.status !== 204) {
              const errorData = await resp.json().catch(() => ({}));
              throw new Error(errorData.message || `Failed to delete resource (${resp.status})`);
          }
          setLessonResources(prev => ({
              ...prev,
              [lessonId]: (prev[lessonId] || []).filter(r => r.id !== resourceId),
          }));
      } catch (err) {
          console.error("Failed to delete resource:", err);
           setResourceUploadState(prev => ({
              ...prev,
              [lessonId]: { ...(prev[lessonId] || { files: [], uploading: false }), error: err instanceof Error ? err.message : 'Delete failed' },
           }));
      }
  };

  // --- Helper to render resource list ONLY IN EDIT MODE ---
  const renderResourceList = (lesson: Lesson) => {
    const resources = lessonResources[lesson.id] || [];
    const uploadState = resourceUploadState[lesson.id] || { files: [], uploading: false };

    return (
      <div className="mt-4 space-y-3">
        <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Manage Lesson Resources
            </h4>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Input
                    type="file" multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.csv,.jpg,.jpeg,.png,.gif"
                    className="w-full sm:w-auto flex-grow h-9 text-sm"
                    ref={el => (resourceInputRefs.current[lesson.id] = el)}
                    onChange={e => handleResourceFileChange(lesson.id, e)}
                    disabled={uploadState.uploading}
                />
                <Button
                    size="sm"
                    className="w-full sm:w-auto flex-shrink-0 px-3 bg-primary dark:bg-blue-600 dark:hover:bg-blue-700"
                    onClick={() => handleResourceUpload(lesson)}
                    disabled={!uploadState.files.length || uploadState.uploading}
                >
                    {uploadState.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    <span className="ml-1.5">Upload {uploadState.files.length > 0 ? `(${uploadState.files.length})` : ''}</span>
                </Button>
            </div>
            {uploadState.files.length > 0 && !uploadState.uploading && (
                <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {uploadState.files.map((file, idx) => (
                        <li key={idx}>{file.name} <span className="text-xs opacity-70">({ (file.size / 1024).toFixed(1) } KB)</span></li>
                    ))}
                </ul>
            )}
            {uploadState.error && (
                <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="text-xs">{uploadState.error}</AlertDescription>
                </Alert>
            )}
        </div>

        {resources.length === 0 && !uploadState.error ? ( // Don't show "no resources" if there's an error
            <div className="text-xs text-muted-foreground py-2">No resources uploaded yet.</div>
        ) : resources.length > 0 ? ( // Only show list if there are resources
            <div className="space-y-2 pt-2">
                {resources.map(resource => (
                    <div key={resource.id} className="flex items-center justify-between gap-2 text-xs border rounded-md p-2 bg-background min-w-0">
                        <a
                            href={`/api/resources/${resource.id}/download`}
                            className="flex-1 text-primary dark:text-gray-500 hover:underline flex items-center gap-1.5 min-w-0"
                            target="_blank" rel="noopener noreferrer" title={resource.filename}
                        >
                            <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-medium truncate">{resource.filename}</span>
                        </a>
                        <div className="flex items-center flex-shrink-0 gap-1">
                            <span className="text-muted-foreground text-[11px] hidden sm:inline">{new Date(resource.uploadedAt).toLocaleDateString()}</span>
                            <Button
                                size="icon" variant="ghost"
                                className="text-destructive hover:text-destructive h-6 w-6"
                                title="Delete resource"
                                onClick={() => handleDeleteResource(resource.id, lesson.id)}
                            > <Trash2 className="h-3.5 w-3.5" /> </Button>
                        </div>
                    </div>
                ))}
            </div>
        ) : null }
      </div>
    );
  };


  // --- Main Render ---
  return (
    <div className="space-y-3">
        {error && (
         <Alert variant="destructive">
           <AlertDescription>{error}</AlertDescription>
         </Alert>
        )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ) : lessons.length === 0 && !showAddForm ? (
            <div className="text-sm text-muted-foreground py-2">No lessons in this module yet.</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={`lessons-droppable-${moduleId}`}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {lessons.filter(l => l.type !== "assessment").map((lesson, index) => (
                  <Draggable key={lesson.id} draggableId={lesson.id.toString()} index={index}>
                    {(providedDraggable) => (
                      <div ref={providedDraggable.innerRef} {...providedDraggable.draggableProps}>
                          {editingLessonId === lesson.id ? (
                            <Card className="w-full border-primary/20 shadow-sm" {...providedDraggable.dragHandleProps}>
                                <CardHeader className="p-3 border-b">
                                    <CardTitle className="text-base font-semibold">Edit Lesson</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <Input placeholder="Lesson Title" value={editingLessonTitle} onChange={(e) => setEditingLessonTitle(e.target.value)} />
                                    <Textarea placeholder="Lesson content (optional)" value={editingLessonContent} onChange={(e) => setEditingLessonContent(e.target.value)} rows={4} />
                                    <div>
                                        <label className="text-sm font-medium block mb-1.5">Lesson Audio/Video</label>
                                        <div className="flex items-center gap-2">
                                            <label className={`flex-grow cursor-pointer border border-dashed rounded-md p-2 text-center text-sm text-muted-foreground hover:border-foreground/50 ${editingLessonVideoUrl ? 'border-green-500 dark:border-green-600 hover:border-green-600' : ''}`}>
                                                <UploadCloud className="h-5 w-5 mx-auto mb-1" />
                                                {editVideoUploadProgress === true ? 'Uploading...' : editingLessonVideoUrl ? `Current: ${editingLessonVideoUrl.split('/').pop()?.substring(0, 30)}... (Replace?)` : "Upload New / Replace Video"}
                                                <Input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => handleEditVideoFileChange(e, lesson.id)} disabled={editVideoUploadProgress === true} />
                                            </label>
                                            {editingLessonVideoUrl && (
                                                <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 h-8 w-8 flex-shrink-0" onClick={() => setEditingLessonVideoUrl('')} title="Remove video link" disabled={editVideoUploadProgress === true}> <Trash2 className="h-4 w-4" /> </Button>
                                            )}
                                        </div>
                                        {editVideoUploadProgress === true && <Loader2 className="h-4 w-4 animate-spin mt-2 text-primary"/> }
                                    </div>
                                    <Separator />
                                    {renderResourceList(lesson)}
                                    <Separator />
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                                        <Button size="sm" className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => handleSaveLessonEdit(lesson.id)}>Save Changes</Button>
                                    </div>
                                </CardContent>
                            </Card>
                          ) : (
                              <div
                                className="flex items-center justify-between p-2 rounded-md bg-background hover:bg-muted/80 transition-colors"
                                {...providedDraggable.dragHandleProps}
                              >
                                  <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab flex-shrink-0" />
                                    {lesson.videoUrl ? <PlayCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                                    <span className="text-sm font-medium flex-grow truncate" title={lesson.title}>{lesson.title}</span>
                                    {lesson.duration && (<span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{Math.floor(lesson.duration / 60)} min</span>)}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditLesson(lesson)} title="Edit Lesson"> <Edit2 className="h-3.5 w-3.5" /> </Button>
                                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 h-7 w-7" onClick={() => handleDeleteLesson(lesson.id)} title="Delete Lesson"> <Trash2 className="h-3.5 w-3.5" /> </Button>
                                  </div>
                              </div>
                          )}
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

      {showAddForm ? (
        <Card className="mt-4 border-dashed">
          <CardHeader className="p-3 border-b">
            <CardTitle className="text-base font-semibold">Add New Lesson</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Input placeholder="Lesson Title (Required)" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} />
            <Textarea placeholder="Lesson content (optional)" value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)} rows={3} />
            <div>
              <label className="text-sm font-medium block mb-1.5">Lesson Audio/Video (Optional)</label>
              <div className="flex items-center gap-2">
                 <label className="flex-grow cursor-pointer border border-dashed rounded-md p-2 text-center text-sm text-muted-foreground hover:border-foreground/50">
                   <UploadCloud className="h-5 w-5 mx-auto mb-1" />
                   {selectedVideoFile ? selectedVideoFile.name : 'Click or drag to upload audio/video'}
                   <Input type="file" accept="video/*,audio/*" className="hidden" onChange={handleVideoFileChange} disabled={isUploadingVideo}/>
                 </label>
                 {selectedVideoFile && !isUploadingVideo && (
                   <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8 flex-shrink-0" onClick={() => setSelectedVideoFile(null)}> <Trash2 className="h-4 w-4" /> </Button>
                 )}
                 {isUploadingVideo && <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0"/>}
              </div>
            </div>
            <Separator />
            {/* --- START: Resource Management for Add New Lesson --- */}
            <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    Attach Resources (Optional)
                </h4>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.csv,.jpg,.jpeg,.png,.gif"
                        className="w-full sm:w-auto flex-grow h-9 text-sm"
                        ref={newLessonResourceInputRef}
                        onChange={handleNewLessonResourceFileChange}
                        disabled={isUploadingNewLessonResources || isUploadingVideo}
                    />
                    {/* No immediate upload button here, files are uploaded with the lesson */}
                </div>
                {/* Display selected files for the new lesson */}
                {newLessonResourceFiles.length > 0 && (
                    // ** MODIFICATION START: Apply similar styling **
                    <div className="mt-3 space-y-2"> {/* Changed ul to div and added spacing */}
                        {newLessonResourceFiles.map((file, idx) => (
                            <div
                                key={idx} // Using index as key is okay here since order matters and items are just for display before upload
                                className="flex items-center justify-between gap-2 text-xs border rounded-md p-2 min-w-0" // Applied similar classes
                            >
                                <div className="flex-1 flex items-center gap-1.5 min-w-0"> {/* Mimic link structure for icon and text */}
                                    <Paperclip className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" /> {/* Added Paperclip icon */}
                                    <span className="font-medium truncate" title={file.name}>{file.name}</span>
                                    <span className="text-muted-foreground text-[11px] ml-1 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <div className="flex items-center flex-shrink-0"> {/* Keep remove button */}
                                    <Button
                                        size="icon" variant="ghost"
                                        className="text-red-500 hover:text-destructive h-6 w-6" // Matched size
                                        title="Remove file"
                                        onClick={() => removeNewLessonResourceFile(file.name)}
                                        disabled={isUploadingNewLessonResources || isUploadingVideo}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    // ** MODIFICATION END **
                )}
                {newLessonResourceError && (
                    <Alert variant="destructive" className="mt-2">
                        <AlertDescription className="text-xs">{newLessonResourceError}</AlertDescription>
                    </Alert>
                )}
                {isUploadingNewLessonResources && (
                    <div className="flex items-center text-sm text-primary mt-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Attaching resources...
                    </div>
                )}
            </div>
            {/* --- END: Resource Management for Add New Lesson --- */}
            <Separator />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => {setShowAddForm(false); setNewLessonTitle(''); setNewLessonContent(''); setSelectedVideoFile(null); setNewLessonResourceFiles([]); setNewLessonResourceError(null); setError(null);}} disabled={isUploadingVideo || isUploadingNewLessonResources}>Cancel</Button>
              <Button size="sm" className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700" onClick={handleAddLesson} disabled={!newLessonTitle.trim() || isUploadingVideo || isUploadingNewLessonResources}>
                {(isUploadingVideo || isUploadingNewLessonResources) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {isUploadingVideo ? 'Uploading Video...' : isUploadingNewLessonResources ? 'Uploading Resources...' : 'Add Lesson'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !isLoading && (
        <Button variant="outline" size="sm" onClick={() => {setShowAddForm(true); setError(null); setNewLessonResourceError(null);}} className="w-full justify-start mt-4">
          <Plus className="mr-2 h-4 w-4" /> Add Lesson
        </Button>
      )}
    </div>
  );
}

export default LessonList;