import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const tasks = await prisma.task.findMany({
      where: { parentId: null },
      include: { subtasks: true },
    });
    res.json(tasks);
  } else if (req.method === "POST") {
    const { title, category, assignee, status, parentId, description } =
      req.body;
    const task = await prisma.task.create({
      data: {
        title,
        category,
        assignee,
        status,
        completed: false,
        description,
        ...(parentId ? { parentId } : {}),
      },
    });
    res.json(task);
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
