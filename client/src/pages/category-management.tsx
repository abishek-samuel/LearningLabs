import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Course {
  id: number;
  title: string;
  description: string;
}

interface Category {
  id: number;
  name: string;
  courses: Course[];
}

export default function CategoryManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [editCategory, setEditCategory] = useState<{ id: number | null; name: string }>({ id: null, name: '' });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<{ id: number | null; open: boolean }>({ id: null, open: false });

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [createCategoryError, setCreateCategoryError] = useState('');
  const [editCategoryError, setEditCategoryError] = useState('');


  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };


  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      setCreateCategoryError('Category name is required');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });

      if (!response.ok) throw new Error('Failed to create category');

      toast({ title: "Success", description: "Category created successfully" });
      setNewCategory('');
      setEditCategoryError('');
      setCreateCategoryError('');
      setIsAddDialogOpen(false);
      await fetchCategories();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editCategory.name.trim()) {
      setEditCategoryError('Category name is required');
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategory.name }),
      });

      if (!response.ok) throw new Error('Failed to update category');

      toast({ title: "Success", description: "Category updated successfully" });
      setIsEditDialogOpen({ id: null, open: false });
      setEditCategoryError('');
      setCreateCategoryError('');
      await fetchCategories();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (deleteTarget === null) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/categories/${deleteTarget}`, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMessage = data?.message || 'Failed to delete category';
        throw new Error(errorMessage);
      }

      toast({ title: "Success", description: "Category deleted successfully" });
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      await fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = selectedCategoryId === 'all'
    ? categories
    : categories.filter((cat) => cat.id === Number(selectedCategoryId));

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">
            Category Management
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input
                    placeholder="Category name"
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      if (createCategoryError) setCreateCategoryError('');
                    }}
                    className={createCategoryError ? "border-red-500" : ""}
                  />
                  {createCategoryError && (
                    <span className="text-sm text-red-500">{createCategoryError}</span>
                  )}
                  <Button onClick={handleCreateCategory} disabled={isLoading}>
                    Create Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>


      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400">
            No categories available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="relative">
                <CardHeader className="flex flex-row justify-between items-start">
                  <CardTitle>{category.name}</CardTitle>
                  <div className="flex gap-2">
                    <Dialog
                      open={isEditDialogOpen.open && isEditDialogOpen.id === category.id}
                      onOpenChange={(open) =>
                        setIsEditDialogOpen({ id: open ? category.id : null, open })
                      }
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditCategory({ id: category.id, name: category.name })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Category</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Input
                            placeholder="Category name"
                            value={editCategory.name}
                            onChange={(e) => {
                              setEditCategory({ id: category.id, name: e.target.value });
                              if (editCategoryError) setEditCategoryError(''); // clear error on change
                            }}
                            className={editCategoryError ? "border-red-500" : ""}
                          />
                          {editCategoryError && (
                            <span className="text-sm text-red-500">{editCategoryError}</span>
                          )}
                          <Button onClick={() => handleUpdateCategory(category.id)} disabled={isLoading}>
                            Update Category
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setDeleteTarget(category.id);
                        setIsDeleteConfirmOpen(true);
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600">
                    {category.courses?.length > 0 ? (
                      category.courses.map((course) => (
                        <div
                          key={course.id}
                          className="p-3 bg-slate-10 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                          onClick={() => navigate(`/course-detail/${course.id}`)}
                        >
                          <h3 className="font-medium">{course.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                            {course.description}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No courses in this category
                      </p>
                    )}
                  </div>
                </CardContent>

              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const category = categories.find((c) => c.id === deleteTarget);
                return category && category.courses.length > 0
                  ? "Cannot Delete Category"
                  : "Confirm Deletion";
              })()}
            </DialogTitle>
          </DialogHeader>

          {categories.find((cat) => cat.id === deleteTarget)?.courses.length ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                This category has linked courses. Please remove these courses first:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-slate-700 dark:text-slate-300">
                {categories
                  .find((cat) => cat.id === deleteTarget)
                  ?.courses.map((course) => (
                    <li key={course.id}>{course.title}</li>
                  ))}
              </ul>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>Are you sure you want to delete this category?</p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCategory}
                  disabled={isLoading}
                >
                  Yes, Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
