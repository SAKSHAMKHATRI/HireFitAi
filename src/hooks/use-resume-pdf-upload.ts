"use client"

import { useEffect, useRef, useState, type DragEvent } from "react"
import { maxResumeFileSize } from "@/lib/resume-upload"

export function useResumePdfUpload(onFileAccepted?: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState("")

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setUploadError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return

    if (selectedFile.type !== "application/pdf") {
      setUploadError("Please upload a PDF resume.")
      return
    }

    if (selectedFile.size > maxResumeFileSize) {
      setUploadError("PDF must be smaller than 8 MB.")
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setUploadError("")
    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    onFileAccepted?.(selectedFile)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  return {
    inputRef,
    file,
    previewUrl,
    isDragging,
    uploadError,
    setIsDragging,
    setUploadError,
    handleFile,
    handleDrop,
    resetFile,
  }
}
