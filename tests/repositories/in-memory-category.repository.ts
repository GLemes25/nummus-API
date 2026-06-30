import { randomUUID } from "crypto";

type InMemoryCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const makeInMemoryCategoryRepository = () => {
  const items: InMemoryCategory[] = [];

  return {
    items,

    create: async (data: { name: string; color: string; icon: string; parentId?: string; userId: string }) => {
      const category: InMemoryCategory = {
        id: randomUUID(),
        name: data.name,
        color: data.color,
        icon: data.icon,
        parentId: data.parentId ?? null,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(category);
      return category;
    },

    findByNameAndParent: async (userId: string, name: string, parentId: string | undefined) => {
      return (
        items.find(
          (c) =>
            c.userId === userId &&
            c.name === name &&
            c.parentId === (parentId ?? null) &&
            c.deletedAt === null
        ) ?? null
      );
    },

    findById: async (id: string) => {
      return items.find((c) => c.id === id && c.deletedAt === null) ?? null;
    },

    findManyByUser: async (userId: string) => {
      return items.filter((c) => c.userId === userId && c.deletedAt === null);
    },
  };
};
