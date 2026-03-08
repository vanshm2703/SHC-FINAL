import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
}

export async function GET(request: any) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const client = await connectToDatabase();
    const db = client.db("self-healing-code");
    const historyCollection = db.collection("history");

    const records = await historyCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    await client.close();

    return NextResponse.json({ records }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function POST(request: any) {
  try {
    const body = await request.json();
    
    console.log("Received history data:", body);

    // UserId is optional - we'll allow saving even without userId
    if (!body.code || !body.prompt) {
      return NextResponse.json(
        { error: "code and prompt are required" },
        { status: 400 }
      );
    }

    const client = await connectToDatabase();
    const db = client.db("self-healing-code");
    const historyCollection = db.collection("history");

    const historyData = {
      userId: body.userId || "anonymous",
      code: body.code,
      prompt: body.prompt,
      pfp: body.pfp || null,
      schema: body.schema || {},
      language: body.language || "unknown",
      dataSources: body.dataSources || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Saving to MongoDB:", historyData);

    const result = await historyCollection.insertOne(historyData);

    await client.close();

    return NextResponse.json(
      { id: result.insertedId, ...historyData },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving history:", error.message);
    console.error("Full error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save history" },
      { status: 500 }
    );
  }
}
