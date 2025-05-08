"use client"

import type React from "react"

import { useState } from "react"
import { Globe, Check, AlertCircle, Loader2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { uploadImageFromUrl, validateImageUrl } from "@/app/actions/media-url-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UrlUploaderProps {
  onUploadComplete?: (mediaId: number, url: string) => void
  defaultCategory?: string
}

export function UrlUploader({ onUploadComplete, defaultCategory = "logo" }: UrlUploaderProps) {
  const [url, setUrl] = useState("")
  const [altText, setAltText] = useState("")
  const [category, setCategory] = useState(defaultCategory)
  const [tags, setTags] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    error?: string
    validated: boolean
    isSvg?: boolean
  }>({ valid: false, validated: false })

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    // Reset validation when URL changes
    setValidationResult({ valid: false, validated: false })
  }

  const validateUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to validate",
        variant: "destructive",
      })
      return
    }

    setIsValidating(true)
    try {
      const result = await validateImageUrl(url)

      // Check if it's likely an SVG based on URL
      const isSvg = url.toLowerCase().endsWith(".svg") || (result.error && result.error.includes("SVG format detected"))

      setValidationResult({
        ...result,
        validated: true,
        isSvg,
      })

      if (!result.valid) {
        toast({
          title: "Invalid URL",
          description: result.error,
          variant: "destructive",
        })
      } else if (isSvg) {
        // For SVGs, we show a special message
        toast({
          title: "SVG Detected",
          description: "SVG file will be validated for security during upload",
        })
      } else {
        toast({
          title: "URL Validated",
          description: "The URL points to a valid image",
        })
      }
    } catch (error) {
      console.error("Error validating URL:", error)
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        validated: true,
      })
      toast({
        title: "Validation failed",
        description: "An error occurred while validating the URL",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleUpload = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to upload",
        variant: "destructive",
      })
      return
    }

    // Validate first if not already validated
    if (!validationResult.validated) {
      await validateUrl()
      // If validation failed, don't proceed
      if (!validationResult.valid) return
    }

    setIsUploading(true)
    try {
      const result = await uploadImageFromUrl(url, {
        alt_text: altText,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      })

      if (result.success && result.asset) {
        toast({
          title: "Upload successful",
          description: "Image has been uploaded successfully",
        })

        // Call the callback if provided
        if (onUploadComplete) {
          onUploadComplete(result.asset.id, result.asset.url)
        }

        // Reset the form
        setUrl("")
        setAltText("")
        setTags("")
        setValidationResult({ valid: false, validated: false })
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
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="image-url">Image URL</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <ImageIcon className="h-4 w-4 mr-1" />
                      <span className="text-xs">Supported formats</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      Supported formats: JPG, PNG, GIF, WebP, and SVG.
                      <br />
                      <br />
                      For SVG files, security validation will be performed to ensure they don't contain malicious code.
                      <br />
                      <br />
                      For Wikipedia images, you can use URLs like:
                      <br />
                      https://en.wikipedia.org/wiki/FX_(TV_channel)#/media/File:FX_International_logo.svg
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={handleUrlChange}
                className="flex-1"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                onClick={validateUrl}
                disabled={!url.trim() || isValidating || isUploading}
                className="whitespace-nowrap"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Validate
                  </>
                )}
              </Button>
            </div>
          </div>

          {validationResult.validated && (
            <Alert variant={validationResult.valid ? "default" : "destructive"}>
              {validationResult.valid ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {validationResult.isSvg && validationResult.valid ? (
                <>
                  <AlertTitle>SVG Detected</AlertTitle>
                  <AlertDescription>
                    SVG file detected. It will be validated for security during upload to ensure it doesn't contain
                    malicious code.
                  </AlertDescription>
                </>
              ) : (
                <AlertDescription>
                  {validationResult.valid
                    ? "URL validated successfully. The image is accessible and meets the requirements."
                    : validationResult.error || "The URL is invalid or inaccessible."}
                </AlertDescription>
              )}
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={isUploading}>
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
                  disabled={isUploading}
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
                disabled={isUploading}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={isUploading || (!validationResult.valid && validationResult.validated)}
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Upload from URL
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
