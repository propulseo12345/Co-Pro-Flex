// ============================================================================
// Edge Function: Communication Workflow Operations
// CoProFlex - Opérations de communication (mur, événements, messagerie)
// Date: 2026-01-26
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// INTERFACES
// ============================================================================

interface CreateWallPostRequest {
  coproId: string;
  title: string;
  content: string;
  category?: string;
  visibility?: string;
  attachmentId?: string;
}

interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
}

interface CreateEventRequest {
  coproId: string;
  title: string;
  description?: string;
  eventType?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  visibility?: string;
  linkedAgId?: string;
  linkedServiceOrderId?: string;
}

interface CreateConversationRequest {
  coproId: string;
  memberUserIds: string[];
  subject?: string;
  isGroup?: boolean;
  initialMessage?: string;
}

interface SendMessageRequest {
  conversationId: string;
  content: string;
  attachmentId?: string;
}

interface TogglePinRequest {
  postId: string;
  isPinned: boolean;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method === "POST" ? await req.json() : null;

    let result;

    switch (action) {
      // Wall operations
      case "create-post":
        result = await handleCreatePost(supabase, body as CreateWallPostRequest, user.id);
        break;

      case "create-comment":
        result = await handleCreateComment(supabase, body as CreateCommentRequest, user.id);
        break;

      case "toggle-like":
        result = await handleToggleLike(supabase, body.postId, user.id);
        break;

      case "toggle-pin":
        result = await handleTogglePin(supabase, body as TogglePinRequest, user.id);
        break;

      case "delete-post":
        result = await handleDeletePost(supabase, body.postId, user.id);
        break;

      // Event operations
      case "create-event":
        result = await handleCreateEvent(supabase, body as CreateEventRequest, user.id);
        break;

      case "update-event":
        result = await handleUpdateEvent(supabase, body.eventId, body.updates, user.id);
        break;

      case "delete-event":
        result = await handleDeleteEvent(supabase, body.eventId, user.id);
        break;

      // Messaging operations
      case "create-conversation":
        result = await handleCreateConversation(supabase, body as CreateConversationRequest, user.id);
        break;

      case "send-message":
        result = await handleSendMessage(supabase, body as SendMessageRequest, user.id);
        break;

      case "mark-conversation-read":
        result = await handleMarkConversationRead(supabase, body.conversationId, user.id);
        break;

      case "leave-conversation":
        result = await handleLeaveConversation(supabase, body.conversationId, user.id);
        break;

      case "add-conversation-member":
        result = await handleAddConversationMember(supabase, body.conversationId, body.userIdToAdd, user.id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    log.error("Communication workflow error", { error });
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// WALL HANDLERS
// ============================================================================

async function handleCreatePost(
  supabase: ReturnType<typeof createClient>,
  data: CreateWallPostRequest,
  userId: string
) {
  // Verify user has access to copro
  const { data: access, error: accessError } = await supabase.rpc("user_has_copro_access", {
    p_copro_id: data.coproId
  });

  if (accessError || !access) {
    return { success: false, error: "Accès non autorisé à cette copropriété" };
  }

  // Check visibility permissions
  if (data.visibility === "council_only") {
    const { data: isMember } = await supabase.rpc("is_council_member", {
      p_copro_id: data.coproId,
      p_user_id: userId
    });
    if (!isMember) {
      return { success: false, error: "Seuls les membres du CS peuvent publier en mode conseil" };
    }
  }

  if (data.visibility === "managers_only") {
    const { data: isManager } = await supabase.rpc("user_is_copro_manager", {
      p_copro_id: data.coproId
    });
    if (!isManager) {
      return { success: false, error: "Seuls les gestionnaires peuvent publier en mode gestionnaire" };
    }
  }

  const { data: post, error: insertError } = await supabase
    .from("wall_posts")
    .insert({
      copro_id: data.coproId,
      author_id: userId,
      title: data.title,
      content: data.content,
      category: data.category || "information",
      visibility: data.visibility || "all_members",
      attachment_id: data.attachmentId || null,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    post,
    message: "Publication créée avec succès"
  };
}

async function handleCreateComment(
  supabase: ReturnType<typeof createClient>,
  data: CreateCommentRequest,
  userId: string
) {
  // Get the post to check access
  const { data: post, error: postError } = await supabase
    .from("wall_posts")
    .select("id, copro_id, visibility")
    .eq("id", data.postId)
    .single();

  if (postError || !post) {
    return { success: false, error: "Publication non trouvée" };
  }

  // Verify user can view the post (implies can comment)
  const { data: canView } = await supabase.rpc("can_view_content", {
    p_copro_id: post.copro_id,
    p_visibility: post.visibility,
    p_user_id: userId
  });

  if (!canView) {
    return { success: false, error: "Vous n'avez pas accès à cette publication" };
  }

  const { data: comment, error: insertError } = await supabase
    .from("wall_comments")
    .insert({
      copro_id: post.copro_id,
      post_id: data.postId,
      author_id: userId,
      content: data.content,
      parent_comment_id: data.parentCommentId || null,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    comment,
    message: "Commentaire ajouté"
  };
}

async function handleToggleLike(
  supabase: ReturnType<typeof createClient>,
  postId: string,
  userId: string
) {
  // Check if already liked
  const { data: existingLike } = await supabase
    .from("wall_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existingLike) {
    // Unlike
    const { error: deleteError } = await supabase
      .from("wall_likes")
      .delete()
      .eq("id", existingLike.id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, liked: false, message: "Like retiré" };
  } else {
    // Like
    // Get post copro_id
    const { data: post } = await supabase
      .from("wall_posts")
      .select("copro_id")
      .eq("id", postId)
      .single();

    if (!post) {
      return { success: false, error: "Publication non trouvée" };
    }

    const { error: insertError } = await supabase
      .from("wall_likes")
      .insert({
        copro_id: post.copro_id,
        post_id: postId,
        user_id: userId,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, liked: true, message: "Like ajouté" };
  }
}

async function handleTogglePin(
  supabase: ReturnType<typeof createClient>,
  data: TogglePinRequest,
  userId: string
) {
  // Get post and verify manager
  const { data: post, error: postError } = await supabase
    .from("wall_posts")
    .select("id, copro_id")
    .eq("id", data.postId)
    .single();

  if (postError || !post) {
    return { success: false, error: "Publication non trouvée" };
  }

  const { data: isManager } = await supabase.rpc("user_is_copro_manager", {
    p_copro_id: post.copro_id
  });

  if (!isManager) {
    return { success: false, error: "Seul le gestionnaire peut épingler une publication" };
  }

  const { error: updateError } = await supabase
    .from("wall_posts")
    .update({
      is_pinned: data.isPinned,
      pinned_at: data.isPinned ? new Date().toISOString() : null,
      pinned_by: data.isPinned ? userId : null,
    })
    .eq("id", data.postId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    isPinned: data.isPinned,
    message: data.isPinned ? "Publication épinglée" : "Publication désépinglée"
  };
}

async function handleDeletePost(
  supabase: ReturnType<typeof createClient>,
  postId: string,
  userId: string
) {
  // Get post
  const { data: post, error: postError } = await supabase
    .from("wall_posts")
    .select("id, copro_id, author_id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return { success: false, error: "Publication non trouvée" };
  }

  // Check permission (author or manager)
  const isAuthor = post.author_id === userId;
  const { data: isManager } = await supabase.rpc("user_is_copro_manager", {
    p_copro_id: post.copro_id
  });

  if (!isAuthor && !isManager) {
    return { success: false, error: "Vous ne pouvez pas supprimer cette publication" };
  }

  const { error: deleteError } = await supabase
    .from("wall_posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true, message: "Publication supprimée" };
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCreateEvent(
  supabase: ReturnType<typeof createClient>,
  data: CreateEventRequest,
  userId: string
) {
  // Check if user can create events (manager or council member)
  const { data: isManager } = await supabase.rpc("user_is_copro_manager", {
    p_copro_id: data.coproId
  });

  const { data: isMember } = await supabase.rpc("is_council_member", {
    p_copro_id: data.coproId,
    p_user_id: userId
  });

  if (!isManager && !isMember) {
    return {
      success: false,
      error: "Seuls les gestionnaires et membres du CS peuvent créer des événements"
    };
  }

  const { data: event, error: insertError } = await supabase
    .from("events")
    .insert({
      copro_id: data.coproId,
      title: data.title,
      description: data.description || null,
      event_type: data.eventType || "autre",
      location: data.location || null,
      starts_at: data.startsAt,
      ends_at: data.endsAt || null,
      all_day: data.allDay || false,
      visibility: data.visibility || "all_members",
      linked_ag_id: data.linkedAgId || null,
      linked_service_order_id: data.linkedServiceOrderId || null,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    event,
    message: "Événement créé avec succès"
  };
}

async function handleUpdateEvent(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  updates: Partial<CreateEventRequest>,
  userId: string
) {
  // Get event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, copro_id, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { success: false, error: "Événement non trouvé" };
  }

  // Check permission
  const isCreator = event.created_by === userId;
  const { data: isManager } = await supabase.rpc("user_is_copro_manager", {
    p_copro_id: event.copro_id
  });

  if (!isCreator && !isManager) {
    return { success: false, error: "Vous ne pouvez pas modifier cet événement" };
  }

  const { data: updatedEvent, error: updateError } = await supabase
    .from("events")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    event: updatedEvent,
    message: "Événement mis à jour"
  };
}

async function handleDeleteEvent(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  userId: string
) {
  // Get event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, copro_id, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { success: false, error: "Événement non trouvé" };
  }

  // Check permission
  const isCreator = event.created_by === userId;
  const { data: isManager } = await supabase.rpc("user_is_copro_manager", {
    p_copro_id: event.copro_id
  });

  if (!isCreator && !isManager) {
    return { success: false, error: "Vous ne pouvez pas supprimer cet événement" };
  }

  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true, message: "Événement supprimé" };
}

// ============================================================================
// MESSAGING HANDLERS
// ============================================================================

async function handleCreateConversation(
  supabase: ReturnType<typeof createClient>,
  data: CreateConversationRequest,
  userId: string
) {
  // Verify user has access
  const { data: access } = await supabase.rpc("user_has_copro_access", {
    p_copro_id: data.coproId
  });

  if (!access) {
    return { success: false, error: "Accès non autorisé" };
  }

  // Check all members have access
  for (const memberId of data.memberUserIds) {
    const { data: memberAccess } = await supabase.rpc("user_has_copro_access", {
      p_copro_id: data.coproId,
      p_user_id: memberId
    });
    if (!memberAccess) {
      return {
        success: false,
        error: "Un des destinataires n'a pas accès à cette copropriété"
      };
    }
  }

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      copro_id: data.coproId,
      subject: data.subject || null,
      is_group: data.isGroup || data.memberUserIds.length > 1,
      created_by: userId,
    })
    .select()
    .single();

  if (convError) {
    return { success: false, error: convError.message };
  }

  // Add creator as admin
  const membersToInsert = [
    {
      copro_id: data.coproId,
      conversation_id: conversation.id,
      user_id: userId,
      is_admin: true,
    },
    ...data.memberUserIds
      .filter(id => id !== userId)
      .map(id => ({
        copro_id: data.coproId,
        conversation_id: conversation.id,
        user_id: id,
        is_admin: false,
      }))
  ];

  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert(membersToInsert);

  if (membersError) {
    // Rollback conversation
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { success: false, error: membersError.message };
  }

  // Send initial message if provided
  if (data.initialMessage) {
    await supabase.from("messages").insert({
      copro_id: data.coproId,
      conversation_id: conversation.id,
      author_id: userId,
      content: data.initialMessage,
    });
  }

  return {
    success: true,
    conversation,
    message: "Conversation créée"
  };
}

async function handleSendMessage(
  supabase: ReturnType<typeof createClient>,
  data: SendMessageRequest,
  userId: string
) {
  // Verify user is member of conversation
  const { data: membership, error: memberError } = await supabase
    .from("conversation_members")
    .select("id, copro_id")
    .eq("conversation_id", data.conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .single();

  if (memberError || !membership) {
    return { success: false, error: "Vous n'êtes pas membre de cette conversation" };
  }

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      copro_id: membership.copro_id,
      conversation_id: data.conversationId,
      author_id: userId,
      content: data.content,
      attachment_id: data.attachmentId || null,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    message,
  };
}

async function handleMarkConversationRead(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  _userId: string
) {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Conversation marquée comme lue" };
}

async function handleLeaveConversation(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  userId: string
) {
  const { error } = await supabase
    .from("conversation_members")
    .update({ left_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Vous avez quitté la conversation" };
}

async function handleAddConversationMember(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  userIdToAdd: string,
  userId: string
) {
  // Verify requester is admin of conversation
  const { data: admin, error: adminError } = await supabase
    .from("conversation_members")
    .select("id, copro_id, is_admin")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .single();

  if (adminError || !admin) {
    return { success: false, error: "Vous n'êtes pas membre de cette conversation" };
  }

  if (!admin.is_admin) {
    return { success: false, error: "Seul un administrateur peut ajouter des membres" };
  }

  // Verify new member has access to copro
  const { data: access } = await supabase.rpc("user_has_copro_access", {
    p_copro_id: admin.copro_id,
    p_user_id: userIdToAdd
  });

  if (!access) {
    return { success: false, error: "Cet utilisateur n'a pas accès à cette copropriété" };
  }

  const { error: insertError } = await supabase
    .from("conversation_members")
    .insert({
      copro_id: admin.copro_id,
      conversation_id: conversationId,
      user_id: userIdToAdd,
      is_admin: false,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: false, error: "Cet utilisateur est déjà membre de la conversation" };
    }
    return { success: false, error: insertError.message };
  }

  return { success: true, message: "Membre ajouté à la conversation" };
}
