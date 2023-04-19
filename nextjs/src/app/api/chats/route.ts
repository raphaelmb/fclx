import { prisma } from "@/prisma/prisma";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const chatCreated = await prisma.chat.create({
    data: {}
  })

  return NextResponse.json(chatCreated)
}

export async function GET(request: NextRequest) {
  const chats = await prisma.chat.findMany({
    orderBy: {
      created_at: "desc"
    }
  })

  return NextResponse.json(chats)
}