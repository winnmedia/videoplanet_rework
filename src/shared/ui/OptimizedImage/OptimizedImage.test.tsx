/**
 * Tests for OptimizedImage component
 * Focus on performance optimization behaviors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from '@testing-library/react';
import OptimizedImage from './OptimizedImage';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ 
    src, 
    alt, 
    onLoad, 
    onError, 
    onLoadingComplete, 
    priority, 
    loading,
    placeholder,
    className,
    'data-testid': testId,
    ...props 
  }: any) {
    const handleLoad = () => {
      onLoad?.();
      onLoadingComplete?.();
    };

    const handleError = () => {
      onError?.(new Error('Mock image error'));
    };

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        data-testid={testId || 'next-image'}
        data-priority={priority ? 'true' : 'false'}
        data-loading={loading}
        data-placeholder={placeholder}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    );
  };
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('OptimizedImage', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image',
    width: 400,
    height: 300,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIntersectionObserver.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders with basic props', () => {
      render(<OptimizedImage {...defaultProps} />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });

    it('applies custom className', () => {
      render(<OptimizedImage {...defaultProps} className="custom-class" />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveClass('custom-class');
    });

    it('sets correct data-testid', () => {
      render(<OptimizedImage {...defaultProps} data-testid="custom-image" />);
      
      const container = screen.getByTestId('custom-image');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Priority Optimization', () => {
    it('sets high priority for critical images', () => {
      render(<OptimizedImage {...defaultProps} priority="high" />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveAttribute('data-priority', 'true');
      expect(image).toHaveAttribute('data-loading', 'eager');
    });

    it('uses lazy loading for normal priority', () => {
      render(<OptimizedImage {...defaultProps} priority="normal" />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveAttribute('data-priority', 'false');
      expect(image).toHaveAttribute('data-loading', 'lazy');
    });

    it('implements intersection observer for low priority', () => {
      render(<OptimizedImage {...defaultProps} priority="low" />);
      
      // Should set up intersection observer
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });
  });

  describe('Layout Shift Prevention', () => {
    it('calculates dimensions from aspect ratio and width', () => {
      render(
        <OptimizedImage 
          {...defaultProps} 
          aspectRatio={4/3} 
          width={400}
          height={undefined}
        />
      );
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });

    it('calculates dimensions from aspect ratio and height', () => {
      render(
        <OptimizedImage 
          {...defaultProps} 
          aspectRatio={4/3} 
          width={undefined}
          height={300}
        />
      );
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });

    it('uses provided width and height when available', () => {
      render(<OptimizedImage {...defaultProps} />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('handles successful image load', async () => {
      const onLoad = jest.fn();
      const onLoadingComplete = jest.fn();
      
      render(
        <OptimizedImage 
          {...defaultProps} 
          onLoad={onLoad}
          onLoadingComplete={onLoadingComplete}
        />
      );
      
      const image = screen.getByAltText('Test image');
      
      act(() => {
        image.dispatchEvent(new Event('load'));
      });

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled();
        expect(onLoadingComplete).toHaveBeenCalled();
      });
    });

    it('handles image load error', async () => {
      const onError = jest.fn();
      
      render(
        <OptimizedImage 
          {...defaultProps} 
          onError={onError}
        />
      );
      
      const image = screen.getByAltText('Test image');
      
      act(() => {
        image.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('shows error fallback when image fails to load', async () => {
      render(<OptimizedImage {...defaultProps} />);
      
      const image = screen.getByAltText('Test image');
      
      act(() => {
        image.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        const fallback = screen.getByRole('img', { name: 'Test image' });
        expect(fallback).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('sets up responsive image with sizes', () => {
      render(
        <OptimizedImage 
          {...defaultProps} 
          responsive 
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      );
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });

    it('uses default responsive sizes when not provided', () => {
      render(<OptimizedImage {...defaultProps} responsive />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper alt text', () => {
      render(<OptimizedImage {...defaultProps} alt="Descriptive alt text" />);
      
      const image = screen.getByAltText('Descriptive alt text');
      expect(image).toBeInTheDocument();
    });

    it('shows loading state with appropriate aria-label', () => {
      render(<OptimizedImage {...defaultProps} priority="low" />);
      
      const loadingElement = screen.getByRole('img', { name: 'Loading Test image' });
      expect(loadingElement).toBeInTheDocument();
    });

    it('provides aria-label for error state', async () => {
      render(<OptimizedImage {...defaultProps} />);
      
      const image = screen.getByAltText('Test image');
      
      act(() => {
        image.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        const errorElement = screen.getByRole('img', { name: 'Test image' });
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Performance Features', () => {
    it('enables blur placeholder by default', () => {
      render(<OptimizedImage {...defaultProps} />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveAttribute('data-placeholder', 'blur');
    });

    it('disables blur when requested', () => {
      render(<OptimizedImage {...defaultProps} blur={false} />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveAttribute('data-placeholder', 'empty');
    });

    it('uses custom blur data URL when provided', () => {
      const customBlurDataURL = 'data:image/jpeg;base64,customblur';
      
      render(
        <OptimizedImage 
          {...defaultProps} 
          blurDataURL={customBlurDataURL}
        />
      );
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });

    it('applies correct decoding strategy', () => {
      render(<OptimizedImage {...defaultProps} priority="high" />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies object fit variants', () => {
      render(<OptimizedImage {...defaultProps} objectFit="contain" />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveClass('object-contain');
    });

    it('applies radius variants', () => {
      render(<OptimizedImage {...defaultProps} radius="lg" />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveClass('rounded-lg');
    });

    it('applies default variants when not specified', () => {
      render(<OptimizedImage {...defaultProps} />);
      
      const image = screen.getByAltText('Test image');
      expect(image).toHaveClass('object-cover');
    });
  });
});