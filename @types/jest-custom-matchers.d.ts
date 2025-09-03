// Custom Jest matchers type declarations
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(secondMock: jest.MockedFunction<any>): R
    }
  }
}

export {}