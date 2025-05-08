"use server"

import { createServerSupabaseClient } from "@/utils/supabase/server"

/**
 * Diagnoses issues with review interactions
 * @param reviewId The review ID
 * @param userId The user ID
 * @returns Diagnostic information
 */
export async function diagnoseReviewInteraction(reviewId: number, userId: string) {
  try {
    console.log(`Diagnosing review interaction: review=${reviewId}, user=${userId}`)
    const supabase = createServerSupabaseClient()

    // Get review information
    const { data: review, error: reviewError } = await supabase
      .from("service_reviews")
      .select("id, user_id, likes, dislikes")
      .eq("id", reviewId)
      .single()

    if (reviewError) {
      console.error("Error fetching review:", reviewError)
      return {
        success: false,
        error: reviewError.message,
        errorCode: reviewError.code,
        review: null,
        interaction: null,
        tables: null,
      }
    }

    // Get interaction data
    const { data: interaction, error: interactionError } = await supabase
      .from("review_interactions")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", userId)

    // Use RPC to get full diagnostic info
    const { data: diagnosis, error: diagnosisError } = await supabase.rpc("check_review_interaction", {
      p_review_id: reviewId,
      p_user_id: userId,
    })

    // Check table structure
    const { data: tables, error: tablesError } = await supabase.rpc("get_table_constraints", {
      table_name: "review_interactions",
    })

    return {
      success: true,
      review,
      interaction: interaction?.[0] || null,
      diagnosis: diagnosis?.[0] || null,
      tables,
      errors: {
        interactionError: interactionError?.message,
        diagnosisError: diagnosisError?.message,
        tablesError: tablesError?.message,
      },
    }
  } catch (error) {
    console.error("Exception in diagnoseReviewInteraction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
    }
  }
}

/**
 * Manual interaction insertion for troubleshooting
 */
export async function forceInsertInteraction(reviewId: number, userId: string, type: "like" | "dislike") {
  try {
    console.log(`Force inserting interaction: review=${reviewId}, user=${userId}, type=${type}`)
    const supabase = createServerSupabaseClient()

    // First try direct insert
    const { data: insertData, error: insertError } = await supabase
      .from("review_interactions")
      .insert({
        review_id: reviewId,
        user_id: userId,
        interaction_type: type,
      })
      .select()

    if (insertError) {
      console.error("Error in direct insert:", insertError)

      // If insertion failed due to unique violation, try update
      if (insertError.code === "23505") {
        // Unique violation
        const { data: updateData, error: updateError } = await supabase
          .from("review_interactions")
          .update({ interaction_type: type })
          .eq("review_id", reviewId)
          .eq("user_id", userId)
          .select()

        if (updateError) {
          console.error("Error in update after unique violation:", updateError)
          return {
            success: false,
            error: updateError.message,
            phase: "update",
          }
        }

        return {
          success: true,
          data: updateData,
          method: "update",
        }
      }

      return {
        success: false,
        error: insertError.message,
        phase: "insert",
      }
    }

    // Update review counts
    const { data: review } = await supabase
      .from("service_reviews")
      .select("likes, dislikes")
      .eq("id", reviewId)
      .single()

    if (review) {
      const { error: updateError } = await supabase
        .from("service_reviews")
        .update({
          likes: type === "like" ? (review.likes || 0) + 1 : review.likes,
          dislikes: type === "dislike" ? (review.dislikes || 0) + 1 : review.dislikes,
        })
        .eq("id", reviewId)

      if (updateError) {
        console.error("Error updating review counts:", updateError)
      }
    }

    return {
      success: true,
      data: insertData,
      method: "insert",
    }
  } catch (error) {
    console.error("Exception in forceInsertInteraction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
    }
  }
}
