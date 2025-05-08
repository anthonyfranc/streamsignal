"use server"

import { createServerSupabaseClient } from "@/utils/supabase/server"

// Function to diagnose interaction issues with detailed logging
export async function diagnoseInteractionIssue(reviewId: number, userId: string) {
  console.log(`=== DIAGNOSTIC START: Review ${reviewId}, User ${userId} ===`)
  try {
    const supabase = createServerSupabaseClient()

    // 1. Check if review exists and get details
    const { data: review, error: reviewError } = await supabase
      .from("service_reviews")
      .select("id, user_id, likes, dislikes, service_id")
      .eq("id", reviewId)
      .single()

    if (reviewError) {
      console.error("DIAGNOSTIC: Review fetch error:", reviewError)
      return {
        success: false,
        message: "Could not find review",
        error: reviewError.message,
      }
    }

    console.log("DIAGNOSTIC: Review data:", review)
    const isSelfLike = review.user_id === userId
    console.log(`DIAGNOSTIC: Self-like attempt: ${isSelfLike ? "YES" : "NO"}`)

    // 2. Check for existing interaction
    const { data: interaction, error: interactionError } = await supabase
      .from("review_interactions")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", userId)

    console.log("DIAGNOSTIC: Existing interaction:", interaction)
    if (interactionError && interactionError.code !== "PGRST116") {
      console.error("DIAGNOSTIC: Interaction fetch error:", interactionError)
    }

    // 3. Check table constraints
    const { data: constraints, error: constraintError } = await supabase.rpc("get_table_constraints", {
      table_name: "review_interactions",
    })

    console.log("DIAGNOSTIC: Table constraints:", constraints)
    if (constraintError) {
      console.error("DIAGNOSTIC: Constraint fetch error:", constraintError)
    }

    // 4. Try a direct insert to see specific error
    const testData = {
      review_id: reviewId,
      user_id: userId,
      interaction_type: "like",
    }

    console.log("DIAGNOSTIC: Attempting test insert with data:", testData)
    const { data: insertResult, error: insertError } = await supabase
      .from("review_interactions")
      .insert(testData)
      .select()

    if (insertError) {
      console.error("DIAGNOSTIC: Insert test error:", insertError)
    } else {
      console.log("DIAGNOSTIC: Insert test succeeded:", insertResult)
    }

    // 5. Check if stored procedure exists
    const { data: procedureExists, error: procedureError } = await supabase.rpc("check_function_exists", {
      function_name: "update_review_interaction",
    })

    console.log("DIAGNOSTIC: Stored procedure check:", procedureExists)
    if (procedureError) {
      console.error("DIAGNOSTIC: Procedure check error:", procedureError)
    }

    console.log(`=== DIAGNOSTIC COMPLETE: Review ${reviewId}, User ${userId} ===`)

    return {
      success: true,
      diagnosticData: {
        review,
        isSelfLike,
        existingInteraction: interaction,
        tableConstraints: constraints,
        insertTest: insertError ? { error: insertError.message, code: insertError.code } : "Insert successful",
        insertResult,
        procedureExists,
      },
    }
  } catch (error) {
    console.error("DIAGNOSTIC: Unexpected error:", error)
    return {
      success: false,
      message: "Diagnostic failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}

// Function to manually insert an interaction (for troubleshooting)
export async function forceInsertInteraction(reviewId: number, userId: string, type: "like" | "dislike") {
  console.log(`=== FORCE INSERT START: ${type} for Review ${reviewId}, User ${userId} ===`)
  try {
    const supabase = createServerSupabaseClient()

    // 1. Get current review data for verification
    const { data: review, error: reviewError } = await supabase
      .from("service_reviews")
      .select("id, user_id, likes, dislikes, service_id")
      .eq("id", reviewId)
      .single()

    if (reviewError) {
      console.error("FORCE INSERT: Review fetch error:", reviewError)
      return {
        success: false,
        message: "Could not find review",
        error: reviewError.message,
      }
    }

    console.log("FORCE INSERT: Current review data:", review)

    // 2. First try to delete any existing interaction
    const { error: deleteError } = await supabase
      .from("review_interactions")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", userId)

    if (deleteError) {
      console.error("FORCE INSERT: Delete existing interaction error:", deleteError)
      // Continue anyway - it might not exist
    }

    // 3. Insert the new interaction with detailed error handling
    console.log("FORCE INSERT: Inserting interaction...")
    const { data: insertData, error: insertError } = await supabase
      .from("review_interactions")
      .insert({
        review_id: reviewId,
        user_id: userId,
        interaction_type: type,
      })
      .select()

    if (insertError) {
      console.error("FORCE INSERT: Insert error:", insertError)
      return {
        success: false,
        message: "Failed to insert interaction",
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
      }
    }

    console.log("FORCE INSERT: Insert successful:", insertData)

    // 4. Update the review counts directly
    const updateField = type === "like" ? "likes" : "dislikes"
    const newCount = type === "like" ? (review.likes || 0) + 1 : (review.dislikes || 0) + 1

    console.log(`FORCE INSERT: Updating ${updateField} count to ${newCount}`)
    const { data: updateData, error: updateError } = await supabase
      .from("service_reviews")
      .update({ [updateField]: newCount })
      .eq("id", reviewId)
      .select()

    if (updateError) {
      console.error("FORCE INSERT: Update count error:", updateError)
      return {
        success: false,
        message: "Failed to update review counts",
        error: updateError.message,
        interactionInserted: true, // Note that the interaction was inserted
      }
    }

    console.log("FORCE INSERT: Update successful:", updateData)
    console.log(`=== FORCE INSERT COMPLETE: ${type} for Review ${reviewId}, User ${userId} ===`)

    return {
      success: true,
      message: `Successfully forced ${type} for review ${reviewId}`,
      data: {
        interaction: insertData,
        updatedReview: updateData,
      },
    }
  } catch (error) {
    console.error("FORCE INSERT: Unexpected error:", error)
    return {
      success: false,
      message: "Exception during force insert",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}

// Function to verify interaction state
export async function verifyInteractionState(reviewId: number, userId: string) {
  console.log(`=== VERIFICATION START: Review ${reviewId}, User ${userId} ===`)
  try {
    const supabase = createServerSupabaseClient()

    // 1. Get review data
    const { data: review, error: reviewError } = await supabase
      .from("service_reviews")
      .select("id, user_id, likes, dislikes, service_id")
      .eq("id", reviewId)
      .single()

    if (reviewError) {
      console.error("VERIFICATION: Review fetch error:", reviewError)
      return {
        success: false,
        message: "Could not find review",
        error: reviewError.message,
      }
    }

    // 2. Get interaction data
    const { data: interactions, error: interactionError } = await supabase
      .from("review_interactions")
      .select("*")
      .eq("review_id", reviewId)

    if (interactionError) {
      console.error("VERIFICATION: Interactions fetch error:", interactionError)
      return {
        success: false,
        message: "Could not fetch interactions",
        error: interactionError.message,
      }
    }

    // 3. Get user's specific interaction
    const { data: userInteraction, error: userInteractionError } = await supabase
      .from("review_interactions")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .maybeSingle()

    if (userInteractionError && userInteractionError.code !== "PGRST116") {
      console.error("VERIFICATION: User interaction fetch error:", userInteractionError)
    }

    // 4. Verify counts match
    const likeCount = interactions.filter((i) => i.interaction_type === "like").length
    const dislikeCount = interactions.filter((i) => i.interaction_type === "dislike").length

    const countsMatch = {
      likes: likeCount === review.likes,
      dislikes: dislikeCount === review.dislikes,
    }

    console.log("VERIFICATION: Review counts:", {
      stored: { likes: review.likes, dislikes: review.dislikes },
      calculated: { likes: likeCount, dislikes: dislikeCount },
      match: countsMatch,
    })

    console.log(`=== VERIFICATION COMPLETE: Review ${reviewId}, User ${userId} ===`)

    return {
      success: true,
      verificationData: {
        review,
        interactions: {
          total: interactions.length,
          likes: likeCount,
          dislikes: dislikeCount,
        },
        userInteraction,
        countsMatch,
        isSelfReview: review.user_id === userId,
      },
    }
  } catch (error) {
    console.error("VERIFICATION: Unexpected error:", error)
    return {
      success: false,
      message: "Verification failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}
