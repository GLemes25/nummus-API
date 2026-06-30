import { faker } from "@faker-js/faker";

type CategoryInput = {
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  userId: string;
};

export const makeFakeCategory = (overrides: Partial<CategoryInput> = {}): CategoryInput => ({
  name: faker.commerce.department(),
  color: faker.color.rgb({ format: "hex" }),
  icon: faker.lorem.word(),
  userId: faker.string.uuid(),
  ...overrides,
});
