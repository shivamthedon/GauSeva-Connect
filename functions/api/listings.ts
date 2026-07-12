import type { EventContext } from "@cloudflare/workers-types";

export async function onRequestGet(context: EventContext<any, string, any>) {
  try {
    const url = new URL(context.request.url);
    const db = context.env.DB;

    // Pagination params
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    // Filter params
    const type = url.searchParams.get("type"); // adopt, sell
    const status = url.searchParams.get("status"); // milking, dry, pregnant, etc.
    const maxPrice = url.searchParams.get("maxPrice");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort") || "newest";

    // Build SQL query dynamically
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Hide completed adoptions from marketplace unless explicitly requested
    if (url.searchParams.get("includeAdopted") !== "1") {
      whereClauses.push(`(json_extract(data, '$.status') IS NULL OR json_extract(data, '$.status') != 'adopted')`);
      whereClauses.push(`(json_extract(data, '$.adoptionStatus') IS NULL OR json_extract(data, '$.adoptionStatus') != 'completed')`);
    }

    // We store listings as JSON in the `data` column
    // D1 supports JSON extraction with json_extract
    if (type && type !== "all") {
      whereClauses.push(`json_extract(data, '$.type') = ?`);
      params.push(type);
    }

    if (status && status !== "all") {
      whereClauses.push(`json_extract(data, '$.milkingStatus') = ?`);
      params.push(status);
    }

    if (maxPrice) {
      whereClauses.push(`(json_extract(data, '$.type') != 'sell' OR json_extract(data, '$.price') <= ?)`);
      params.push(parseInt(maxPrice));
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(json_extract(data, '$.title')) LIKE ? OR
        LOWER(json_extract(data, '$.breed')) LIKE ? OR
        LOWER(json_extract(data, '$.location')) LIKE ? OR
        LOWER(json_extract(data, '$.description')) LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Sort
    let orderBySQL = "ORDER BY rowid DESC"; // newest by default
    if (sort === "priceAsc") orderBySQL = "ORDER BY json_extract(data, '$.price') ASC";
    else if (sort === "priceDesc") orderBySQL = "ORDER BY json_extract(data, '$.price') DESC";
    else if (sort === "age") orderBySQL = "ORDER BY CAST(json_extract(data, '$.age') AS REAL) ASC";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM listings ${whereSQL}`;
    const countResult = await db.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;

    // Get paginated results
    const dataQuery = `SELECT data FROM listings ${whereSQL} ${orderBySQL} LIMIT ? OFFSET ?`;
    const rows = await db.prepare(dataQuery).bind(...params, limit, offset).all();
    const listings = rows.results.map((row: any) => JSON.parse(row.data));

    return Response.json(
      {
        listings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total,
        },
      },
      {
        headers: {
          // Short cache + SWR so marketplace feels snappy on repeat views
          "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
