import {
  createServiceClient,
  isAdmin,
  jsonResponse,
  logAudit,
  readJson,
  requireMethod,
  verifyWebUser,
} from "../_shared/extension-session.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const webUser = await verifyWebUser(supabase, req);
    const isUserAdmin = await isAdmin(supabase, webUser.id);
    if (!isUserAdmin) throw new Error("Unauthorized");

    const body = await readJson(req);
    
    // We only have one global config row per environment usually, scope = 'global'
    const scope = body.scope || 'global';
    
    if (!body.sections || !body.exclusion_rules || !body.prompt_skeleton) {
      throw new Error("Missing required config fields: sections, exclusion_rules, prompt_skeleton");
    }

    const { data: existing, error: fetchError } = await supabase
      .from("description_config")
      .select("*")
      .eq("scope", scope)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);

    const { data: updated, error: updateError } = await supabase
      .from("description_config")
      .upsert({
        scope: scope,
        sections: body.sections,
        exclusion_rules: body.exclusion_rules,
        prompt_skeleton: body.prompt_skeleton,
        output_format: body.output_format || 'html_ebay_safe',
        version: existing ? existing.version + 1 : 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "scope" })
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    await logAudit(supabase, {
      actorUserId: webUser.id,
      action: "ADMIN_UPDATE_DESCRIPTION_CONFIG",
      entityType: "description_config",
      entityId: scope,
      oldValues: existing || null,
      newValues: updated,
      metadata: { version: updated.version },
    });

    return jsonResponse({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 403 : 400);
  }
});
