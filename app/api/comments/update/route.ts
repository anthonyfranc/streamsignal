import { NextResponse } from "next/server"
import { updateComment } from "@/app/actions/review-actions"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await updateComment(formData)

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, comment: result.comment })
  } catch (error) {
    console.error("Error in comment update API:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
