import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    // Get the current user
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.getUser()

    if (authError || !data.user) {
      console.error("Authentication error in API route:", authError)
      return NextResponse.json({ success: false, error: "You must be logged in to edit a comment" }, { status: 401 })
    }

    const commentId = formData.get("commentId") as string
    const content = formData.get("content") as string

    if (!commentId || !content) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Verify the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from("review_comments")
      .select("user_id")
      .eq("id", commentId)
      .single()

    if (fetchError) {
      console.error("Error fetching comment:", fetchError)
      return NextResponse.json({ success: false, error: "Failed to verify comment ownership" }, { status: 500 })
    }

    if (comment.user_id !== data.user.id) {
      return NextResponse.json({ success: false, error: "You can only edit your own comments" }, { status: 403 })
    }

    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from("review_comments")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select()

    if (error) {
      console.error("Error updating comment:", error)
      return NextResponse.json({ success: false, error: "Failed to update comment" }, { status: 500 })
    }

    return NextResponse.json({ success: true, comment: updatedComment[0] })
  } catch (error) {
    console.error("Error in comment update API:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
