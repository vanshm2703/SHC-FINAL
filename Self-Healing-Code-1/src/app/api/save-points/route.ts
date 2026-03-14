import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
}

// POST - Save points after PR creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { userId, userEmail, points, prUrl, prNumber, repoName, branchName, bugsFixed, severityBreakdown } = body;

    if (!userId || !prUrl || points === undefined) {
      return NextResponse.json({ error: 'userId, prUrl, and points are required' }, { status: 400 });
    }

    const client = await connectToDatabase();
    const db = client.db('self-healing-code');

    // 1. Insert the points record
    const pointsCollection = db.collection('points');
    const pointsRecord = {
      userId,
      userEmail: userEmail || '',
      points,
      prUrl,
      prNumber: prNumber || 0,
      repoName: repoName || '',
      branchName: branchName || 'main',
      bugsFixed: bugsFixed || [],
      severityBreakdown: severityBreakdown || {},
      createdAt: new Date(),
    };
    const insertResult = await pointsCollection.insertOne(pointsRecord);

    // 2. Upsert user's total points in the users collection
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { userId },
      {
        $inc: { totalPoints: points, totalPRs: 1 },
        $set: { userEmail: userEmail || '', updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    await client.close();

    return NextResponse.json({
      success: true,
      id: insertResult.insertedId,
      points,
      message: `${points} points saved successfully`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving points:', error);
    return NextResponse.json({ error: error.message || 'Failed to save points' }, { status: 500 });
  }
}

// GET - Fetch points history and total for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const client = await connectToDatabase();
    const db = client.db('self-healing-code');

    // Get user total
    const usersCollection = db.collection('users');
    const userDoc = await usersCollection.findOne({ userId });

    // Get points history
    const pointsCollection = db.collection('points');
    const records = await pointsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    await client.close();

    return NextResponse.json({
      totalPoints: userDoc?.totalPoints || 0,
      totalPRs: userDoc?.totalPRs || 0,
      records,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching points:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch points' }, { status: 500 });
  }
}
