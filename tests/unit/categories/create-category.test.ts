import { describe, it, expect } from "vitest";
import { makeCreateCategoryUseCase } from "../../../src/modules/categories/use-cases/create-category.use-case.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { faker } from "@faker-js/faker";

describe("makeCreateCategoryUseCase", () => {
  it("should create a root category successfully", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const createCategory = makeCreateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const input = makeFakeCategory({ userId });

    // Act
    const category = await createCategory(input);

    // Assert
    expect(category.name).toBe(input.name);
    expect(category.color).toBe(input.color);
    expect(category.icon).toBe(input.icon);
    expect(category.parentId).toBeNull();
    expect(repo.items).toHaveLength(1);
  });

  it("should create a subcategory with a parentId successfully", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const createCategory = makeCreateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();

    const parent = await createCategory(makeFakeCategory({ userId, name: "Parent Category" }));

    // Act
    const child = await createCategory(
      makeFakeCategory({ userId, name: "Child Category", parentId: parent.id })
    );

    // Assert
    expect(child.parentId).toBe(parent.id);
    expect(repo.items).toHaveLength(2);
  });

  it("should throw when creating two categories with the same name at the same hierarchy level", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const createCategory = makeCreateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const duplicateName = "Groceries";

    await createCategory(makeFakeCategory({ userId, name: duplicateName }));

    // Act & Assert
    await expect(
      createCategory(makeFakeCategory({ userId, name: duplicateName }))
    ).rejects.toMatchObject({
      code: "CATEGORY_ALREADY_EXISTS",
      message: "Já existe uma categoria com este nome neste nível",
    });

    expect(repo.items).toHaveLength(1);
  });

  it("should allow the same category name under different parent categories", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const createCategory = makeCreateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();

    const parentA = await createCategory(makeFakeCategory({ userId, name: "Parent A" }));
    const parentB = await createCategory(makeFakeCategory({ userId, name: "Parent B" }));

    // Act
    await createCategory(makeFakeCategory({ userId, name: "Food", parentId: parentA.id }));
    await createCategory(makeFakeCategory({ userId, name: "Food", parentId: parentB.id }));

    // Assert
    expect(repo.items).toHaveLength(4);
  });

  it("should throw when creating duplicate subcategory under the same parent", async () => {
    // Arrange
    const repo = makeInMemoryCategoryRepository();
    const createCategory = makeCreateCategoryUseCase(repo as any);
    const userId = faker.string.uuid();
    const parent = await createCategory(makeFakeCategory({ userId, name: "Parent" }));

    await createCategory(makeFakeCategory({ userId, name: "Sub", parentId: parent.id }));

    // Act & Assert
    await expect(
      createCategory(makeFakeCategory({ userId, name: "Sub", parentId: parent.id }))
    ).rejects.toMatchObject({
      code: "CATEGORY_ALREADY_EXISTS",
      message: "Já existe uma categoria com este nome neste nível",
    });
  });
});
