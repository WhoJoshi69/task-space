import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const taskId = Number(id);

  if (req.method === "PUT") {
    const { title, completed, category, assignee, status } = req.body;
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { title, completed, category, assignee, status },
    });
    res.json(task);
  } else if (req.method === "DELETE") {
    await prisma.task.delete({ where: { id: taskId } });
    res.status(204).end();
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
