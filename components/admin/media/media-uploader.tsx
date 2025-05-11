"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, ImageIcon, FileText, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { createMediaAsset } from "@/app/actions/media-actions"
import { validateAndSanitizeSVG } from "@/lib/svg-validator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadToBlob } from "@/lib/blob-storage"

interface MediaUploaderProps {
  onUploadComplete?: (mediaId: number, url: string) => void
  defaultCategory?: string
  allowedTypes?: string[]
  maxSize?: number // in MB
}

export function MediaUploader({
  onUploadComplete,
  defaultCategory = "logo",
  allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp"],
  maxSize = 5, // 5MB default
}: MediaUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [svgValidation, setSvgValidation] = useState<{ valid: boolean; error?: string } | null>(null)
  const [altText, setAltText] = useState("")
  const [category, setCategory] = useState(defaultCategory)
  const [tags, setTags] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validate file type
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: `Please upload one of the following: ${allowedTypes.join(", ")}`,
          variant: "destructive",
        })
        return
      }

      // Validate file size
      if (selectedFile.size > maxSize * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${maxSize}MB`,
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)

      // Reset SVG validation
      setSvgValidation(null)

      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setPreview(event.target?.result as string)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        setPreview(null)
      }

      // Validate SVG files for security
      if (selectedFile.type === "image/svg+xml") {
        setValidating(true)
        try {
          const svgContent = await selectedFile.text()
          const validation = validateAndSanitizeSVG(svgContent)
          setSvgValidation({
            valid: validation.isValid,
            error: validation.error,
          })

          if (!validation.isValid) {
            toast({
              title: "SVG Validation Failed",
              description: validation.error,
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("SVG validation error:", error)
          setSvgValidation({
            valid: false,
            error: error instanceof Error ? error.message : "Unknown error validating SVG",
          })
          toast({
            title: "SVG Validation Error",
            description: "Failed to validate SVG file",
            variant: "destructive",
          })
        } finally {
          setValidating(false)
        }
      }
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setSvgValidation(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (!file) return

    // Don't allow upload of invalid SVG files
    if (file.type === "image/svg+xml" && svgValidation && !svgValidation.valid) {
      toast({
        title: "Invalid SVG",
        description: "Cannot upload invalid or potentially unsafe SVG file",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      // Generate a unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split(".").pop() || ""
      const filename = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

      // For SVG files, we need to sanitize before uploading
      let fileToUpload: File | Buffer = file
      if (file.type === "image/svg+xml") {
        const svgContent = await file.text()
        const validation = validateAndSanitizeSVG(svgContent)
        if (validation.sanitized) {
          fileToUpload = Buffer.from(validation.sanitized, "utf-8")
        }
      }

      // Upload to Vercel Blob storage
      const blobResult = await uploadToBlob({
        filename: `media/${filename}`,
        contentType: file.type,
        data: fileToUpload,
      })

      if (!blobResult.success) {
        throw new Error(blobResult.error || "Failed to upload to blob storage")
      }

      // Create thumbnail (in a real app, you would generate a proper thumbnail)
      // For now, we'll just use the same URL
      const thumbnailUrl = blobResult.url

      // Create the media asset record in the database
      const result = await createMediaAsset({
        filename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: blobResult.url!,
        thumbnail_url: thumbnailUrl,
        alt_text: altText,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        uploaded_by: "admin@example.com", // In a real app, this would be the current user
      })

      if (result.success && result.asset) {
        toast({
          title: "Upload successful",
          description: "Media has been uploaded successfully",
        })

        // Call the callback if provided
        if (onUploadComplete) {
          onUploadComplete(result.asset.id, result.asset.url)
        }

        // Reset the form
        clearFile()
        setAltText("")
        setTags("")
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {!file ? (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">
                  {allowedTypes.join(", ")} (Max {maxSize}MB)
                </p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept={allowedTypes.join(",")}
              />
            </div>
          ) : (
            <div className="relative border rounded-lg p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>

              <div className="flex items-center gap-4">
                {preview ? (
                  <div className="h-20 w-20 rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img src={preview || "/placeholder.svg"} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded bg-muted flex items-center justify-center">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                  </p>

                  {validating && (
                    <div className="flex items-center mt-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Validating SVG file...
                    </div>
                  )}

                  {uploading && (
                    <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-primary animate-pulse rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {file.type === "image/svg+xml" && svgValidation && (
                <Alert variant={svgValidation.valid ? "default" : "destructive"} className="mt-2">
                  <AlertDescription>
                    {svgValidation.valid
                      ? "SVG validated successfully. It's safe to upload."
                      : `SVG validation failed: ${svgValidation.error}`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo">Logo</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="thumbnail">Thumbnail</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                    <SelectItem value="icon">Icon</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  placeholder="streaming, logo, brand"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Textarea
                id="alt-text"
                placeholder="Descriptive text for accessibility"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={
                  !file ||
                  uploading ||
                  (file.type === "image/svg+xml" && (validating || (svgValidation && !svgValidation.valid)))
                }
                className="w-full sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
