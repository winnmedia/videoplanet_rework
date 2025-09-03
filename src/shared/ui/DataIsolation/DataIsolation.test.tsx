import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataIsolationProvider, useDataIsolation } from './DataIsolation'
import { IsolatedDataList, UserDataBoundary } from './DataIsolation'
import { RBACContext, RBACContextValue } from '@/shared/lib/rbac-system'
import { AuthenticatedUser } from '@/features/authentication/model/types'

const mockOwner: AuthenticatedUser = {
  id: '1',
  email: 'owner@test.com',
  username: 'owner',
  role: 'owner',
  permissions: ['project:full']
}

const mockEditor: AuthenticatedUser = {
  id: '2', 
  email: 'editor@test.com',
  username: 'editor',
  role: 'editor',
  permissions: ['project:edit']
}

const mockProjects = [
  { id: '1', name: 'Project 1', userId: '1', createdBy: '1' },
  { id: '2', name: 'Project 2', userId: '2', createdBy: '2' },
  { id: '3', name: 'Project 3', userId: '3', createdBy: '3' }
]

const TestComponent = () => {
  const { filteredData, loading, error } = useDataIsolation({
    data: mockProjects,
    isolationLevel: 'user'
  })
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {filteredData.map(project => (
        <div key={project.id} data-testid={`project-${project.id}`}>
          {project.name}
        </div>
      ))}
    </div>
  )
}

const renderWithContext = (component: React.ReactElement, user: AuthenticatedUser) => {
  const contextValue: RBACContextValue = {
    user,
    permissions: user.permissions,
    loading: false
  }
  
  return render(
    <RBACContext.Provider value={contextValue}>
      <DataIsolationProvider>
        {component}
      </DataIsolationProvider>
    </RBACContext.Provider>
  )
}

describe('DataIsolation System', () => {
  describe('useDataIsolation Hook', () => {
    it('should filter data to user-owned items only for non-privileged users', async () => {
      renderWithContext(<TestComponent />, mockEditor)
      
      await waitFor(() => {
        expect(screen.getByTestId('project-2')).toBeInTheDocument()
        expect(screen.queryByTestId('project-1')).not.toBeInTheDocument()
        expect(screen.queryByTestId('project-3')).not.toBeInTheDocument()
      })
    })
    
    it('should show all data for privileged users (owner)', async () => {
      renderWithContext(<TestComponent />, mockOwner)
      
      await waitFor(() => {
        expect(screen.getByTestId('project-1')).toBeInTheDocument()
        expect(screen.getByTestId('project-2')).toBeInTheDocument()
        expect(screen.getByTestId('project-3')).toBeInTheDocument()
      })
    })
    
    it('should handle empty data gracefully', () => {
      const EmptyTestComponent = () => {
        const { filteredData, loading } = useDataIsolation({
          data: [],
          isolationLevel: 'user'
        })
        
        return loading ? <div>Loading...</div> : <div data-testid="empty">No data</div>
      }
      
      renderWithContext(<EmptyTestComponent />, mockEditor)
      
      expect(screen.getByTestId('empty')).toBeInTheDocument()
    })
  })

  describe('IsolatedDataList Component', () => {
    const mockRenderItem = (item: typeof mockProjects[0]) => (
      <div key={item.id} data-testid={`item-${item.id}`}>
        {item.name}
      </div>
    )

    it('should render filtered items correctly', async () => {
      renderWithContext(
        <IsolatedDataList
          data={mockProjects}
          renderItem={mockRenderItem}
          isolationLevel="user"
        />,
        mockEditor
      )

      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toBeInTheDocument()
        expect(screen.queryByTestId('item-1')).not.toBeInTheDocument()
      })
    })

    it('should show empty state when no data', () => {
      renderWithContext(
        <IsolatedDataList
          data={[]}
          renderItem={mockRenderItem}
          isolationLevel="user"
          emptyMessage="데이터가 없습니다"
        />,
        mockEditor
      )

      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      renderWithContext(
        <IsolatedDataList
          data={mockProjects}
          renderItem={mockRenderItem}
          isolationLevel="user"
          loading={true}
        />,
        mockEditor
      )

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('데이터 로딩 중...')).toBeInTheDocument()
    })
  })

  describe('UserDataBoundary Component', () => {
    it('should show access denied for unauthorized data access', () => {
      const unauthorizedData = { userId: '999', content: 'Secret data' }
      
      renderWithContext(
        <UserDataBoundary dataOwnerId="999">
          <div>Secret Content</div>
        </UserDataBoundary>,
        mockEditor
      )

      expect(screen.getByText('이 데이터에 접근할 권한이 없습니다')).toBeInTheDocument()
      expect(screen.queryByText('Secret Content')).not.toBeInTheDocument()
    })

    it('should allow access to own data', () => {
      renderWithContext(
        <UserDataBoundary dataOwnerId="2">
          <div>My Content</div>
        </UserDataBoundary>,
        mockEditor
      )

      expect(screen.getByText('My Content')).toBeInTheDocument()
    })

    it('should allow privileged users to access all data', () => {
      renderWithContext(
        <UserDataBoundary dataOwnerId="999">
          <div>Any Content</div>
        </UserDataBoundary>,
        mockOwner
      )

      expect(screen.getByText('Any Content')).toBeInTheDocument()
    })

    it('should render custom fallback message', () => {
      renderWithContext(
        <UserDataBoundary 
          dataOwnerId="999"
          fallback={<div>커스텀 접근 거부 메시지</div>}
        >
          <div>Content</div>
        </UserDataBoundary>,
        mockEditor
      )

      expect(screen.getByText('커스텀 접근 거부 메시지')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should provide proper ARIA labels for data isolation components', () => {
      renderWithContext(
        <IsolatedDataList
          data={mockProjects}
          renderItem={mockRenderItem}
          isolationLevel="user"
        />,
        mockEditor
      )

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-label', '사용자 데이터 목록')
    })

    it('should announce data filtering to screen readers', async () => {
      renderWithContext(<TestComponent />, mockEditor)
      
      await waitFor(() => {
        expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
      })
    })
  })
})