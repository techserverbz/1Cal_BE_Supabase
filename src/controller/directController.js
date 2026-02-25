import { eq, or, and, ne, ilike, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { directFeasibilities } from "../schema/directFeasibilities.js";
import { templates } from "../schema/templates.js";
import { newObjectId } from "../utils/objectId.js";

function toDirectResponse(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}

/** Selected columns for direct + template join (used by getMyFeasibilities, getCollaborativeFeasibilities, getAllDirect). */
const directWithTemplateSelect = {
  id: directFeasibilities.id,
  templateId: directFeasibilities.templateId,
  name: directFeasibilities.name,
  pages: directFeasibilities.pages,
  masterinput: directFeasibilities.masterinput,
  createdAt: directFeasibilities.createdAt,
  lastModifiedAt: directFeasibilities.lastModifiedAt,
  inputsections: directFeasibilities.inputsections,
  newPages: directFeasibilities.newPages,
  newMasterinput: directFeasibilities.newMasterinput,
  newInputsections: directFeasibilities.newInputsections,
  userid: directFeasibilities.userid,
  collaborators: directFeasibilities.collaborators,
  isDisabled: directFeasibilities.isDisabled,
  fixedparameterset: directFeasibilities.fixedparameterset,
  templateName: templates.name,
  templateScheme: templates.scheme,
  templateRulebook: templates.rulebook,
  templateDescription: templates.description,
};

/**
 * Maps a joined row (direct + template) to the old API shape: _id, populated templateId,
 * CreatedAt, LastModifiedAt, and legacy new_pages, new_masterinput, new_inputsections.
 */
function toDirectResponseWithTemplate(row) {
  if (!row) return null;
  const {
    templateName,
    templateScheme,
    templateRulebook,
    templateDescription,
    ...direct
  } = row;
  const base = toDirectResponse(direct);
  base.templateId =
    row.templateId &&
    (templateName != null ||
      templateScheme != null ||
      templateRulebook != null ||
      templateDescription != null)
      ? {
          _id: row.templateId,
          name: templateName ?? null,
          scheme: templateScheme ?? null,
          rulebook: templateRulebook ?? null,
          description: templateDescription ?? null,
        }
      : row.templateId;
  base.templateName = templateName ?? null;
  base.TemplateName = templateName ?? null;
  base.CreatedAt = direct.createdAt ?? null;
  base.LastModifiedAt = direct.lastModifiedAt ?? null;
  base.new_pages = direct.newPages ?? {};
  base.new_masterinput = direct.newMasterinput ?? {};
  base.new_inputsections = direct.newInputsections ?? {};
  return base;
}

export async function cloneFullTemplate(req, res) {
  try {
    const { templateId, userid } = req.body;
    const [original] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    if (!original) return res.status(404).json({ message: "Template not found" });

    const [clone] = await db
      .insert(directFeasibilities)
      .values({
        id: newObjectId(),
        templateId: original.id,
        masterinput: original.masterinput || [],
        name: original.name,
        userid: userid || null,
      })
      .returning();
    return res.status(201).json(toDirectResponse(clone));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createCopy(req, res) {
  try {
    const { id } = req.params;
    const { userid } = req.body;
    const [original] = await db.select().from(directFeasibilities).where(eq(directFeasibilities.id, id)).limit(1);
    if (!original) return res.status(404).json({ message: "Formula template not found" });

    const [clone] = await db
      .insert(directFeasibilities)
      .values({
        id: newObjectId(),
        templateId: original.templateId,
        masterinput: original.masterinput || [],
        name: "Copy of " + (original.name || ""),
        userid: userid || null,
      })
      .returning();
    return res.status(201).json(toDirectResponse(clone));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveMasterInput(req, res) {
  try {
    const { masterinput, new_masterinput, new_pages, new_inputsections, userid, LastModifiedAt, fixedparameterset } = req.body;
    const { id } = req.params;

    const [existing] = await db.select().from(directFeasibilities).where(eq(directFeasibilities.id, id)).limit(1);
    if (!existing) return res.status(404).json({ message: "Template not found." });

    const isOwner = existing.userid && String(existing.userid) === String(userid);
    const collaborators = (existing.collaborators || []);
    const isCollaborator = Array.isArray(collaborators) && collaborators.some((c) => String(c) === String(userid));

    if (!isOwner && !isCollaborator && existing.userid) {
      return res.status(403).json({ message: "You are not authorized to save." });
    }

    const updateData = {
      masterinput: masterinput ?? existing.masterinput,
      userid: existing.userid || userid,
      lastModifiedAt: LastModifiedAt ? new Date(LastModifiedAt) : new Date(),
    };
    if (new_pages !== undefined) updateData.newPages = new_pages;
    if (new_masterinput !== undefined) updateData.newMasterinput = new_masterinput;
    if (new_inputsections !== undefined) updateData.newInputsections = new_inputsections;
    if (fixedparameterset !== undefined) updateData.fixedparameterset = fixedparameterset;

    const [updated] = await db.update(directFeasibilities).set(updateData).where(eq(directFeasibilities.id, id)).returning();
    return res.status(200).json(toDirectResponse(updated));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFormulaTemplateById(req, res) {
  try {
    const { id } = req.params;

    const [directTemplate] = await db.select().from(directFeasibilities).where(eq(directFeasibilities.id, id)).limit(1);
    if (!directTemplate) return res.status(404).json({ message: "Formula template not found" });

    const [originalTemplate] = await db.select().from(templates).where(eq(templates.id, directTemplate.templateId)).limit(1);
    if (!originalTemplate) return res.status(404).json({ message: "Original template not found" });

    const templateCache = {};
    const origPages = originalTemplate.pages || [];
    const directPages = directTemplate.pages || [];

    const mergedPages = origPages.map((page, pageIndex) => {
      const originalPage = origPages[pageIndex] || {};
      const directPage = directPages[pageIndex] || page;
      const pageRows = directPage.rows || page.rows || [];
      const origPageRows = originalPage.rows || [];

      const mergedRows = pageRows.map((row, rowIndex) => {
        const originalRow = origPageRows[rowIndex] || {};
        const rowContent = row.content || [];
        const origContent = originalRow.content || [];

        const mergedContent = rowContent.map((cell, cellIndex) => {
          if (!Array.isArray(cell)) return [];
          const originalCell = origContent[cellIndex];
          const value = Array.isArray(originalCell) ? originalCell[0] : undefined;
          const formula = Array.isArray(originalCell) ? originalCell[1] : undefined;
          const style = Array.isArray(originalCell) ? originalCell[2] : undefined;
          const result = [];
          if (value !== undefined) result[0] = value;
          if (formula !== undefined) result[1] = formula;
          if (style !== undefined) result[2] = style;
          return result;
        });

        return { ...row, content: mergedContent };
      });

      return {
        ...page,
        name: originalPage.name || "default",
        order: page.order !== undefined ? page.order : 0,
        rows: mergedRows,
      };
    });

    const pagesfromother = (originalTemplate.pagesfromother || []).slice().sort((a, b) => {
      const orderA = typeof a?.importedPageOrder === "number" ? a.importedPageOrder : typeof a?.order === "number" ? a.order : Infinity;
      const orderB = typeof b?.importedPageOrder === "number" ? b.importedPageOrder : typeof b?.order === "number" ? b.order : Infinity;
      return orderA - orderB;
    });

    for (const importRef of pagesfromother) {
      if (!importRef?.isActive) continue;
      try {
        if (!templateCache[importRef.sourceTemplateId]) {
          const [st] = await db.select().from(templates).where(eq(templates.id, importRef.sourceTemplateId)).limit(1);
          if (!st) continue;
          templateCache[importRef.sourceTemplateId] = st;
        }
        const sourceTemplate = templateCache[importRef.sourceTemplateId];
        const sourcePages = sourceTemplate.pages || [];
        const sourcePage = sourcePages.find((p) => p.id === importRef.sourcePageId);
        if (!sourcePage) continue;

        const importedPageId = importRef.importedPageId || sourcePage.id;
        const importedPageOrder = importRef.importedPageOrder ?? sourcePage.order;
        const matchedPage = (directTemplate.pages || []).find((p) => p.id === importedPageId);
        const sourceRows = sourcePage.rows || [];

        const importedMergedRows = sourceRows.map((row, rowIndex) => {
          const matchedRow = matchedPage?.rows?.[rowIndex] || {};
          const rowContent = row.content || [];
          const mergedContent = rowContent.map((cell, cellIndex) => {
            if (!Array.isArray(cell)) return [];
            const matchedCell = (matchedRow.content || [])[cellIndex];
            const value = Array.isArray(matchedCell) ? matchedCell[0] : undefined;
            const formula = Array.isArray(matchedCell) ? matchedCell[1] : undefined;
            const style = Array.isArray(matchedCell) ? matchedCell[2] : undefined;
            const origCell = rowContent[cellIndex];
            const origValue = Array.isArray(origCell) ? origCell[0] : undefined;
            const origFormula = Array.isArray(origCell) ? origCell[1] : undefined;
            const origStyle = Array.isArray(origCell) ? origCell[2] : undefined;
            const result = [];
            result[0] = value !== undefined ? value : origValue;
            result[1] = formula !== undefined ? formula : origFormula;
            result[2] = style !== undefined ? style : origStyle;
            return result;
          });
          return { ...row, content: mergedContent };
        });

        mergedPages.push({
          ...sourcePage,
          id: importedPageId,
          order: importedPageOrder,
          name: matchedPage?.name || sourcePage.name || "default",
          rows: importedMergedRows,
        });
      } catch (e) {
        console.error("Error fetching imported page:", e);
      }
    }

    const directMasterinput = directTemplate.masterinput || [];
    const origMasterinput = originalTemplate.masterinput || [];
    const mergedMasterInput = origMasterinput.map((origRow) => {
      const matched = directMasterinput.find((r) => r.name === origRow.name);
      return {
        ...origRow,
        value: matched?.value != null && matched?.value !== "" ? matched.value : origRow.value,
        displayName: matched?.displayName ?? origRow.displayName,
        templateValue: origRow.value,
      };
    });

    const masterinputfromother = (originalTemplate.masterinputfromother || []).slice().sort((a, b) => {
      const orderA = typeof a?.order === "number" ? a.order : Infinity;
      const orderB = typeof b?.order === "number" ? b.order : Infinity;
      return orderA - orderB;
    });

    for (const importRef of masterinputfromother) {
      if (!importRef?.isActive) continue;
      try {
        if (!templateCache[importRef.sourceTemplateId]) {
          const [st] = await db.select().from(templates).where(eq(templates.id, importRef.sourceTemplateId)).limit(1);
          if (!st) continue;
          templateCache[importRef.sourceTemplateId] = st;
        }
        const sourceTemplate = templateCache[importRef.sourceTemplateId];
        const sourceInputs = sourceTemplate.masterinput || [];
        const individualInput = sourceInputs.find((mi) => mi.id === importRef.sourceMasterInputId);
        const importedInputs = individualInput ? [individualInput] : [];
        for (const importedRow of importedInputs) {
          const matched = directMasterinput.find((r) => r.name === importedRow.name);
          const val =
            matched?.value != null && matched?.value !== ""
              ? matched.value
              : importRef.importedMasterInputs?.[0]?.value != null && importRef.importedMasterInputs[0].value !== ""
                ? importRef.importedMasterInputs[0].value
                : importedRow.value;
          const displayName = importRef.importedMasterInputs?.[0]?.overrideDisplayValue != null && importRef.importedMasterInputs[0].overrideDisplayValue !== ""
            ? importRef.importedMasterInputs[0].overrideDisplayValue
            : importedRow.displayName;
          mergedMasterInput.push({
            ...importedRow,
            value: val,
            displayName,
            hidden: importedRow.hidden || importRef.importedMasterInputs?.[0]?.hidden,
            templateValue: importRef.importedMasterInputs?.[0]?.value ?? importedRow.value,
          });
        }
      } catch (e) {
        console.error("Error fetching imported masterinput:", e);
      }
    }

    const sortedMergedPages = mergedPages.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    const sortedMergedMasterInput = mergedMasterInput.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

    const result = {
      ...directTemplate,
      id: directTemplate.id,
      _id: directTemplate.id,
      pages: sortedMergedPages,
      masterinput: sortedMergedMasterInput,
      pagesfromother: originalTemplate.pagesfromother || [],
      inputsections: originalTemplate.inputsections || [],
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function buildDirectFilters(query, userId, startDateStr, endDateStr) {
  const conditions = [];
  if (userId && userId !== "all") {
    conditions.push(
      or(
        eq(directFeasibilities.userid, userId),
        sql`${directFeasibilities.collaborators} @> ${JSON.stringify([userId])}::jsonb`
      )
    );
  }
  if (query) {
    conditions.push(ilike(directFeasibilities.name, `%${query}%`));
  }
  if (startDateStr || endDateStr) {
    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const validStart = startDate && !isNaN(startDate.getTime());
    const validEnd = endDate && !isNaN(endDate.getTime());
    if (validStart || validEnd) {
      const modRange = [];
      const createdRange = [];
      if (validStart) {
        modRange.push(gte(directFeasibilities.lastModifiedAt, startDate));
        createdRange.push(gte(directFeasibilities.createdAt, startDate));
      }
      if (validEnd) {
        modRange.push(lte(directFeasibilities.lastModifiedAt, endDate));
        createdRange.push(lte(directFeasibilities.createdAt, endDate));
      }
      conditions.push(or(and(...modRange), and(...createdRange)));
    }
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAllDirect(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userid;
    const searchQuery = req.query.query || "";
    const startDateStr = req.query.startDate;
    const endDateStr = req.query.endDate;

    const filter = buildDirectFilters(searchQuery, userId, startDateStr, endDateStr);

    const baseQuery = db
      .select(directWithTemplateSelect)
      .from(directFeasibilities)
      .leftJoin(templates, eq(directFeasibilities.templateId, templates.id));
    const dataQuery = filter ? baseQuery.where(filter) : baseQuery;
    const list = await dataQuery
      .orderBy(desc(directFeasibilities.lastModifiedAt), desc(directFeasibilities.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = filter
      ? db.select({ count: sql`count(*)::int` }).from(directFeasibilities).where(filter)
      : db.select({ count: sql`count(*)::int` }).from(directFeasibilities);
    const [{ count: totalTemplates }] = await countQuery;

    const data = list.map(toDirectResponseWithTemplate);
    return res.status(200).json({
      data,
      currentPage: page,
      totalPages: Math.ceil((totalTemplates || 0) / limit),
      totalItems: totalTemplates || 0,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({ message: "Error getting templates", error: error.message });
  }
}

export async function getAnalytics(req, res) {
  try {
    const userId = req.query.userid;
    const searchQuery = (req.query.query || "").trim();
    const startDateStr = req.query.startDate;
    const endDateStr = req.query.endDate;

    let filter = undefined;
    if (userId && userId !== "all") {
      filter = or(
        eq(directFeasibilities.userid, userId),
        sql`${directFeasibilities.collaborators} @> ${JSON.stringify([userId])}::jsonb`
      );
    }
    if (searchQuery) {
      const searchCond = or(
        ilike(directFeasibilities.name, `%${searchQuery}%`),
        sql`${directFeasibilities.name} ILIKE ${"%" + searchQuery + "%"}`
      );
      filter = filter ? and(filter, searchCond) : searchCond;
    }
    if (startDateStr || endDateStr) {
      const startDate = startDateStr ? new Date(startDateStr) : null;
      const endDate = endDateStr ? new Date(endDateStr) : null;
      const rangeCond = or(
        and(
          startDate && !isNaN(startDate.getTime()) ? gte(directFeasibilities.lastModifiedAt, startDate) : undefined,
          endDate && !isNaN(endDate.getTime()) ? lte(directFeasibilities.lastModifiedAt, endDate) : undefined
        ),
        and(
          startDate && !isNaN(startDate.getTime()) ? gte(directFeasibilities.createdAt, startDate) : undefined,
          endDate && !isNaN(endDate.getTime()) ? lte(directFeasibilities.createdAt, endDate) : undefined
        )
      );
      filter = filter ? and(filter, rangeCond) : rangeCond;
    }

    const allRows = filter ? await db.select().from(directFeasibilities).where(filter) : await db.select().from(directFeasibilities);
    const totalItems = allRows.length;
    const usersSet = new Set(allRows.map((r) => r.userid).filter(Boolean));
    const templatesSet = new Set(allRows.map((r) => r.templateId).filter(Boolean));
    const latestUpdate = allRows.reduce((acc, r) => {
      const d = r.lastModifiedAt || r.createdAt;
      return !acc || (d && d > acc) ? d : acc;
    }, null);

    const summary = {
      totalItems,
      uniqueUsers: usersSet.size,
      uniqueTemplates: templatesSet.size,
      latestUpdate,
    };

    const byUser = {};
    allRows.forEach((r) => {
      if (r.userid) byUser[r.userid] = (byUser[r.userid] || 0) + 1;
    });
    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userid, count]) => ({ userid, count }));

    const byTemplate = {};
    allRows.forEach((r) => {
      if (r.templateId) byTemplate[r.templateId] = (byTemplate[r.templateId] || 0) + 1;
    });
    const topTemplates = await Promise.all(
      Object.entries(byTemplate)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(async ([templateId, count]) => {
          const [t] = await db.select({ name: templates.name }).from(templates).where(eq(templates.id, templateId)).limit(1);
          return { templateId, templateName: t?.name ?? null, count };
        })
    );

    res.json({ summary, topUsers, topTemplates });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
}

export async function getMyFeasibilities(req, res) {
  try {
    const userId = req.query.userid;
    if (!userId) return res.status(400).json({ message: "Missing userId in query params" });

    const searchQuery = req.query.query || "";
    const page = parseInt(req.query.myPage) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const conditions = [eq(directFeasibilities.userid, userId)];
    if (searchQuery) conditions.push(ilike(directFeasibilities.name, `%${searchQuery}%`));
    const filter = and(...conditions);

    const [countResult] = await db.select({ count: sql`count(*)::int` }).from(directFeasibilities).where(filter);
    const totalTemplates = Number(countResult?.count ?? 0);

    const list = await db
      .select(directWithTemplateSelect)
      .from(directFeasibilities)
      .leftJoin(templates, eq(directFeasibilities.templateId, templates.id))
      .where(filter)
      .orderBy(desc(directFeasibilities.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return res.status(200).json({
      data: list.map(toDirectResponseWithTemplate),
      currentPage: page,
      totalPages: Math.ceil(totalTemplates / limit),
      totalItems: totalTemplates,
    });
  } catch (error) {
    console.error("Error fetching my feasibilities:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

export async function getCollaborativeFeasibilities(req, res) {
  try {
    const userId = req.query.userid;
    if (!userId) return res.status(400).json({ message: "Missing userId in query params" });

    const searchQuery = req.query.query || "";
    const page = parseInt(req.query.myPage) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = and(
      sql`${directFeasibilities.collaborators} @> ${JSON.stringify([userId])}::jsonb`,
      ne(directFeasibilities.userid, userId)
    );
    const conditions = [filter];
    if (searchQuery) conditions.push(ilike(directFeasibilities.name, `%${searchQuery}%`));
    const fullFilter = and(...conditions);

    const [countResult] = await db.select({ count: sql`count(*)::int` }).from(directFeasibilities).where(fullFilter);
    const totalTemplates = Number(countResult?.count ?? 0);

    const list = await db
      .select(directWithTemplateSelect)
      .from(directFeasibilities)
      .leftJoin(templates, eq(directFeasibilities.templateId, templates.id))
      .where(fullFilter)
      .orderBy(desc(directFeasibilities.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return res.status(200).json({
      data: list.map(toDirectResponseWithTemplate),
      currentPage: page,
      totalPages: Math.ceil(totalTemplates / limit),
      totalItems: totalTemplates,
    });
  } catch (error) {
    console.error("Error fetching collaborative feasibilities:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

export async function addCollaborator(req, res) {
  try {
    const { id } = req.params;
    const { collab, userid } = req.body;

    const [existing] = await db.select().from(directFeasibilities).where(eq(directFeasibilities.id, id)).limit(1);
    if (!existing) return res.status(404).json({ message: "Template not found." });

    const isOwner = existing.userid && String(existing.userid) === String(userid);
    const collaborators = existing.collaborators || [];
    const isCollaborator = Array.isArray(collaborators) && collaborators.some((c) => String(c) === String(userid));

    if (!isOwner && !isCollaborator && existing.userid) {
      return res.status(403).json({ message: "You are not authorized to add collaborators." });
    }

    await db.update(directFeasibilities).set({ collaborators: Array.isArray(collab) ? collab : [] }).where(eq(directFeasibilities.id, id));
    return res.status(200).json({ message: "Collaborators updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function updatename(req, res) {
  try {
    const { id } = req.params;
    const { name, userid } = req.body;

    if (!name || String(name).trim() === "") return res.status(400).json({ message: "Name cannot be empty" });

    const [existing] = await db.select().from(directFeasibilities).where(eq(directFeasibilities.id, id)).limit(1);
    if (!existing) return res.status(404).json({ message: "Feasibility not found." });

    const isOwner = existing.userid && String(existing.userid) === String(userid);
    const collaborators = existing.collaborators || [];
    const isCollaborator = Array.isArray(collaborators) && collaborators.some((c) => String(c) === String(userid));

    if (!isOwner && !isCollaborator && existing.userid) {
      return res.status(403).json({ message: "You are not authorized to update this feasibility." });
    }

    const [updated] = await db
      .update(directFeasibilities)
      .set({ name: String(name).trim() })
      .where(eq(directFeasibilities.id, id))
      .returning();
    return res.status(200).json({ success: true, message: "Feasibility name updated successfully", data: toDirectResponse(updated) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

export async function getDatewiseGrowthAnalytics(req, res) {
  try {
    const userId = req.query.userid;
    const range = (req.query.range || "30d").toLowerCase();
    const now = new Date();
    const start = new Date(now);
    if (range === "30d") start.setDate(start.getDate() - 30);
    else if (range === "2m") start.setMonth(start.getMonth() - 2);
    else if (range === "3m") start.setMonth(start.getMonth() - 3);
    else if (range === "6m") start.setMonth(start.getMonth() - 6);
    else if (range === "1y") start.setFullYear(start.getFullYear() - 1);
    else start.setDate(start.getDate() - 30);

    let filter = undefined;
    if (userId && userId !== "all") {
      filter = or(
        eq(directFeasibilities.userid, userId),
        sql`${directFeasibilities.collaborators} @> ${JSON.stringify([userId])}::jsonb`
      );
    }

    const allRows = filter ? await db.select().from(directFeasibilities).where(filter) : await db.select().from(directFeasibilities);

    const createdCounts = [];
    const modifiedCounts = [];
    const createdByDay = {};
    const modifiedByDay = {};

    allRows.forEach((r) => {
      const created = r.createdAt ? new Date(r.createdAt) : null;
      if (created && created >= start) {
        const key = created.toISOString().slice(0, 10);
        createdByDay[key] = (createdByDay[key] || 0) + 1;
      }
      const modified = r.lastModifiedAt ? new Date(r.lastModifiedAt) : null;
      if (modified && modified >= start) {
        const key = modified.toISOString().slice(0, 10);
        modifiedByDay[key] = (modifiedByDay[key] || 0) + 1;
      }
    });

    Object.entries(createdByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([k, v]) => createdCounts.push({ _id: k, count: v }));
    Object.entries(modifiedByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([k, v]) => modifiedCounts.push({ _id: k, count: v }));

    return res.status(200).json({
      range,
      startDate: start,
      endDate: now,
      createdCounts,
      modifiedCounts,
    });
  } catch (error) {
    console.error("Error computing datewise growth:", error);
    return res.status(500).json({ message: "Error computing datewise growth", error: error.message });
  }
}
