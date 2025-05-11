"use client"

import { useState } from "react"
import { PlusCircle, Edit, Trash2, FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { ContentCategoryForm } from "./content-category-form"
import { ContentItemForm } from "./content-item-form"
import type { ContentCategory, ContentItem } from "@/types/streaming"
import {
  createContentCategory,
  updateContentCategory,
  deleteContentCategory,
  createContentItem,
  updateContentItem,
  deleteContentItem,
} from "@/app/actions/content-admin-actions"

interface ContentCategoriesManagerProps {
  serviceId: number
  categories: ContentCategory[]
}

export function ContentCategoriesManager({ serviceId, categories }: ContentCategoriesManagerProps) {
  const [categoriesState, setCategoriesState] = useState<ContentCategory[]>(categories)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false)
  const [isDeleteItemDialogOpen, setIsDeleteItemDialogOpen] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [activeTab, setActiveTab] = useState(categories.length > 0 ? String(categories[0].id) : "")

  const handleAddCategory = async (data: Omit<ContentCategory, "id" | "created_at">) => {
    const result = await createContentCategory(data)
    if (result.success && result.id) {
      // Add the new category to the state
      const newCategory: ContentCategory = {
        ...data,
        id: result.id,
        created_at: new Date().toISOString(),
        items: [],
      }
      setCategoriesState((prev) => [...prev, newCategory])

      // Set the active tab to the new category
      setActiveTab(String(result.id))

      // Close the dialog
      setIsAddCategoryDialogOpen(false)
    }
    return result
  }

  const handleEditCategory = async (data: Omit<ContentCategory, "id" | "created_at">) => {
    if (!selectedCategory) return { success: false, error: "No category selected" }
    const result = await updateContentCategory(selectedCategory.id, data)

    if (result.success) {
      // Update the category in state
      setCategoriesState((prev) =>
        prev.map((category) => (category.id === selectedCategory.id ? { ...category, ...data } : category)),
      )

      // Close the dialog
      setIsEditCategoryDialogOpen(false)
      setSelectedCategory(null)
    }

    return result
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return
    try {
      const result = await deleteContentCategory(selectedCategory.id)
      if (result.success) {
        // Update local state by removing the deleted category
        setCategoriesState((prevCategories) => prevCategories.filter((c) => c.id !== selectedCategory.id))

        toast({
          title: "Success",
          description: "Category deleted successfully.",
        })

        // Update active tab if necessary
        if (activeTab === String(selectedCategory.id)) {
          const newCategories = categoriesState.filter((c) => c.id !== selectedCategory.id)
          setActiveTab(newCategories.length > 0 ? String(newCategories[0].id) : "")
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete category.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleteCategoryDialogOpen(false)
      setSelectedCategory(null)
    }
  }

  const handleAddItem = async (data: Omit<ContentItem, "id" | "created_at">) => {
    const result = await createContentItem(data)

    if (result.success && result.id) {
      // Add the new item to the appropriate category
      const newItem: ContentItem = {
        ...data,
        id: result.id,
        created_at: new Date().toISOString(),
      }

      setCategoriesState((prev) =>
        prev.map((category) => {
          if (category.id === data.category_id) {
            return {
              ...category,
              items: [...(category.items || []), newItem],
            }
          }
          return category
        }),
      )

      // Close the dialog
      setIsAddItemDialogOpen(false)
    }

    return result
  }

  const handleEditItem = async (data: Omit<ContentItem, "id" | "created_at">) => {
    if (!selectedItem) return { success: false, error: "No item selected" }
    const result = await updateContentItem(selectedItem.id, data)

    if (result.success) {
      // Update the item in state
      setCategoriesState((prev) =>
        prev.map((category) => {
          if (category.id === selectedItem.category_id) {
            return {
              ...category,
              items: category.items?.map((item) => (item.id === selectedItem.id ? { ...item, ...data } : item)) || [],
            }
          }
          return category
        }),
      )

      // Close the dialog
      setIsEditItemDialogOpen(false)
      setSelectedItem(null)
    }

    return result
  }

  const handleDeleteItem = async () => {
    if (!selectedItem) return
    try {
      const result = await deleteContentItem(selectedItem.id)
      if (result.success) {
        // Update local state by removing the deleted item
        setCategoriesState((prevCategories) =>
          prevCategories.map((category) => {
            if (category.id === selectedItem.category_id) {
              return {
                ...category,
                items: category.items?.filter((item) => item.id !== selectedItem.id) || [],
              }
            }
            return category
          }),
        )

        toast({
          title: "Success",
          description: "Content item deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete content item.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleteItemDialogOpen(false)
      setSelectedItem(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Content Categories</h2>
        <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {categoriesState.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <FilePlus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Content Categories</h3>
            <p className="text-sm text-gray-500 mb-4">
              This service doesn't have any content categories yet. Add a category to get started.
            </p>
            <Button onClick={() => setIsAddCategoryDialogOpen(true)}>Add First Category</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full overflow-x-auto flex flex-nowrap justify-start px-1">
            {categoriesState.map((category) => (
              <TabsTrigger key={category.id} value={String(category.id)} className="flex-shrink-0 whitespace-nowrap">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categoriesState.map((category) => (
            <TabsContent key={category.id} value={String(category.id)} className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{category.name}</h3>
                  {category.description && <p className="text-sm text-gray-500">{category.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory(category)
                      setIsEditCategoryDialogOpen(true)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedCategory(category)
                      setIsDeleteCategoryDialogOpen(true)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Content Items</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category)
                        setIsAddItemDialogOpen(true)
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                  </div>
                  <CardDescription>Manage the content items in this category</CardDescription>
                </CardHeader>
                <CardContent>
                  {category.items && category.items.length > 0 ? (
                    <ScrollArea className="h-[500px] rounded-md border">
                      <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {category.items.map((item) => (
                            <Card key={item.id}>
                              <div className="aspect-video relative overflow-hidden rounded-t-md bg-gray-100">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url || "/placeholder.svg"}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center bg-gray-200">
                                    <span className="text-xl font-bold text-gray-400">
                                      {item.title.substring(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 flex space-x-1">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-7 w-7 rounded-full opacity-70 hover:opacity-100"
                                    onClick={() => {
                                      setSelectedItem(item)
                                      setIsEditItemDialogOpen(true)
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-7 w-7 rounded-full opacity-70 hover:opacity-100"
                                    onClick={() => {
                                      setSelectedItem(item)
                                      setIsDeleteItemDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <h4 className="font-medium line-clamp-1">{item.title}</h4>
                                {item.content_type && (
                                  <span className="inline-block text-xs mt-1 bg-gray-100 px-2 py-1 rounded-full">
                                    {item.content_type}
                                  </span>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="rounded-full bg-gray-100 p-3 mb-4">
                        <FilePlus className="h-5 w-5 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium mb-2">No Content Items</h3>
                      <p className="text-xs text-gray-500 mb-4">This category doesn't have any content items yet.</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(category)
                          setIsAddItemDialogOpen(true)
                        }}
                      >
                        Add First Item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Content Category</DialogTitle>
            <DialogDescription>Create a new content category for this streaming service.</DialogDescription>
          </DialogHeader>
          <ContentCategoryForm
            serviceId={serviceId}
            onSubmit={handleAddCategory}
            onCancel={() => setIsAddCategoryDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Content Category</DialogTitle>
            <DialogDescription>Update the details of this content category.</DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <ContentCategoryForm
              serviceId={serviceId}
              category={selectedCategory}
              onSubmit={handleEditCategory}
              onCancel={() => setIsEditCategoryDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{selectedCategory?.name}"? This will also delete all content
              items in this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Content Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Content Item</DialogTitle>
            <DialogDescription>Add a new content item to the "{selectedCategory?.name}" category.</DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <ContentItemForm
              categoryId={selectedCategory.id}
              onSubmit={handleAddItem}
              onCancel={() => setIsAddItemDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Content Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Content Item</DialogTitle>
            <DialogDescription>Update the details of this content item.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <ContentItemForm
              categoryId={selectedItem.category_id}
              item={selectedItem}
              onSubmit={handleEditItem}
              onCancel={() => setIsEditItemDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Content Item Confirmation */}
      <AlertDialog open={isDeleteItemDialogOpen} onOpenChange={setIsDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the content item "{selectedItem?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
