/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/db/',
        '<rootDir>/src/lib/',
        '<rootDir>/src/domain/',
        '<rootDir>/src/onboarding/',
        '<rootDir>/src/tracking/',
        '<rootDir>/src/i18n/',
      ],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|native-base|react-native-svg|nativewind|react-native-css|standard-navigation|@noble/.*)',
      ],
    },
    {
      // Lógica de banco: roda em Node puro, com node:sqlite real nos testes de migration.
      displayName: 'db',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/db/**/*.test.ts',
        '<rootDir>/src/lib/**/*.test.ts',
        '<rootDir>/src/domain/**/*.test.ts',
        '<rootDir>/src/onboarding/**/*.test.ts',
        '<rootDir>/src/tracking/**/*.test.ts',
        '<rootDir>/src/i18n/**/*.test.ts',
      ],
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      // @noble/* só publica ESM.
      transformIgnorePatterns: ['/node_modules/(?!@noble/)'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
  ],
};
