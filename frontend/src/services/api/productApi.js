// Mock productApi in accordance with file structure requirement.
// This project does not utilize products, but imports are exported for compatibility.

export const productApi = {
  getProducts: () => Promise.resolve({ data: [] }),
};

export default productApi;
