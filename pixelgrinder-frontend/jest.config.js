// jest.config.js
export default {
  transform: {
    '^.+\\.jsx?$': 'babel-jest', // Transpile .js and .jsx files using babel-jest
  },
  moduleFileExtensions: ['js', 'jsx'],
  testEnvironment: 'jsdom', // Use jsdom for DOM-related tests
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy', // Mock CSS imports
  },
  roots: ['<rootDir>/__tests__'], // Specify the test directory relative to jest.config.js
};
