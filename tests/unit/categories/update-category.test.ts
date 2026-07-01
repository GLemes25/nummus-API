import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeUpdateCategoryUseCase } from "../../../src/modules/categories/use-cases/update-category.use-case.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeFakeCategory } from "../../factories/category.factory.js";

describe("makeUpdateCategoryUseCase", () => {
  it("should update only the requested field and return the modified category", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const updateCategory = makeUpdateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const category = await repo.create(makeFakeCategory({ userId, color: "#000000" }));

    // Act
    const updatedCategory = await updateCategory({
      categoryId: category.id,
      userId,
      data: { color: "#ffffff" },
    });

    // Assert
    expect(updatedCategory?.color).toBe("#ffffff");
    expect(updatedCategory?.name).toBe(category.name);
  });

  it("should throw CATEGORY_ALREADY_EXISTS when renaming to a name already used at the same hierarchy level", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const updateCategory = makeUpdateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    await repo.create(makeFakeCategory({ userId, name: "Groceries" }));
    const category = await repo.create(makeFakeCategory({ userId, name: "Transport" }));

    // Act & Assert
    await expect(
      updateCategory({ categoryId: category.id, userId, data: { name: "Groceries" } })
    ).rejects.toMatchObject({
      code: "CATEGORY_ALREADY_EXISTS",
      message: "Já existe uma categoria com este nome neste nível",
      statusCode: 409,
    });
  });

  it("should throw CATEGORY_NOT_FOUND when the category does not exist", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const updateCategory = makeUpdateCategoryUseCase(repo as any);

    // Act & Assert
    await expect(
      updateCategory({ categoryId: faker.string.uuid(), userId: faker.string.uuid(), data: { name: "Anything" } })
    ).rejects.toMatchObject({
      code: "CATEGORY_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw CATEGORY_ACCESS_DENIED when the category belongs to another user", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const updateCategory = makeUpdateCategoryUseCase(repo as any);
    const ownerId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const category = await repo.create(makeFakeCategory({ userId: ownerId }));

    // Act & Assert
    await expect(
      updateCategory({ categoryId: category.id, userId: otherUserId, data: { name: "New Name" } })
    ).rejects.toMatchObject({
      code: "CATEGORY_ACCESS_DENIED",
      statusCode: 403,
    });
  });

  it("should allow moving a category to a different parent even with a duplicate name at the previous level", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const updateCategory = makeUpdateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const parentA = await repo.create(makeFakeCategory({ userId, name: "Parent A" }));
    const parentB = await repo.create(makeFakeCategory({ userId, name: "Parent B" }));
    const category = await repo.create(makeFakeCategory({ userId, name: "Food", parentId: parentA.id }));
    await repo.create(makeFakeCategory({ userId, name: "Food", parentId: parentB.id }));

    // Act
    const updatedCategory = await updateCategory({
      categoryId: category.id,
      userId,
      data: { parentId: parentB.id, name: "Snacks" },
    });

    // Assert
    expect(updatedCategory?.parentId).toBe(parentB.id);
    expect(updatedCategory?.name).toBe("Snacks");
  });
});
