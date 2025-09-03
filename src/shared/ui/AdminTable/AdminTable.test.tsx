import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AdminTable, type Column } from './AdminTable'

expect.extend(toHaveNoViolations)

interface TestData {
  id: number
  name: string
  role: string
  status: 'active' | 'inactive'
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', role: 'Admin', status: 'active' },
  { id: 2, name: 'Jane Smith', role: 'User', status: 'inactive' },
  { id: 3, name: 'Mike Johnson', role: 'Editor', status: 'active' },
]

const mockColumns: Column<TestData>[] = [
  {
    key: 'id',
    title: 'ID',
    width: 80,
  },
  {
    key: 'name',
    title: '이름',
    sortable: true,
  },
  {
    key: 'role',
    title: '역할',
    sortable: true,
  },
  {
    key: 'status',
    title: '상태',
    render: (value) => (
      <span className={value === 'active' ? 'text-green-600' : 'text-red-600'}>
        {value === 'active' ? '활성' : '비활성'}
      </span>
    ),
  },
]

describe('AdminTable', () => {
  describe('기본 렌더링', () => {
    it('테이블이 올바르게 렌더링된다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          data-testid="admin-table"
        />
      )
      
      expect(screen.getByTestId('admin-table')).toBeInTheDocument()
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('컬럼 헤더가 올바르게 렌더링된다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
        />
      )
      
      expect(screen.getByRole('columnheader', { name: /ID/ })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /이름/ })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /역할/ })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /상태/ })).toBeInTheDocument()
    })

    it('데이터 행이 올바르게 렌더링된다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
        />
      )
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
    })
  })

  describe('정렬 기능', () => {
    it('정렬 가능한 컬럼에 정렬 아이콘이 표시된다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
        />
      )
      
      const nameHeader = screen.getByRole('button', { name: /이름 컬럼 정렬/ })
      expect(nameHeader).toBeInTheDocument()
      expect(nameHeader).toHaveTextContent('⇅') // 기본 정렬 아이콘
    })

    it('컬럼 헤더 클릭시 정렬 콜백이 호출된다', () => {
      const mockSortChange = jest.fn()
      
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          onSortChange={mockSortChange}
        />
      )
      
      const nameHeader = screen.getByRole('button', { name: /이름 컬럼 정렬/ })
      fireEvent.click(nameHeader)
      
      expect(mockSortChange).toHaveBeenCalledWith('name', 'asc')
    })

    it('키보드로 정렬이 가능하다', () => {
      const mockSortChange = jest.fn()
      
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          onSortChange={mockSortChange}
        />
      )
      
      const nameHeader = screen.getByRole('button', { name: /이름 컬럼 정렬/ })
      
      fireEvent.keyDown(nameHeader, { key: 'Enter' })
      expect(mockSortChange).toHaveBeenCalledWith('name', 'asc')
      
      fireEvent.keyDown(nameHeader, { key: ' ' })
      expect(mockSortChange).toHaveBeenCalledWith('name', 'asc')
    })
  })

  describe('행 상호작용', () => {
    it('행 클릭 이벤트가 올바르게 처리된다', () => {
      const mockRowClick = jest.fn()
      
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          onRowClick={mockRowClick}
        />
      )
      
      const firstRow = screen.getByRole('button', { name: /테이블 행 1 선택/ })
      fireEvent.click(firstRow)
      
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0], 0)
    })

    it('키보드로 행 선택이 가능하다', () => {
      const mockRowClick = jest.fn()
      
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          onRowClick={mockRowClick}
        />
      )
      
      const firstRow = screen.getByRole('button', { name: /테이블 행 1 선택/ })
      
      fireEvent.keyDown(firstRow, { key: 'Enter' })
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0], 0)
      
      fireEvent.keyDown(firstRow, { key: ' ' })
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0], 0)
    })
  })

  describe('특수 상태', () => {
    it('로딩 상태를 올바르게 표시한다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={[]}
          loading={true}
          data-testid="loading-table"
        />
      )
      
      expect(screen.getByTestId('loading-table-loading')).toBeInTheDocument()
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })

    it('빈 데이터 상태를 올바르게 표시한다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={[]}
          data-testid="empty-table"
        />
      )
      
      expect(screen.getByTestId('empty-table-empty')).toBeInTheDocument()
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
    })

    it('커스텀 빈 데이터 메시지를 표시한다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={[]}
          emptyText="사용자를 찾을 수 없습니다"
        />
      )
      
      expect(screen.getByText('사용자를 찾을 수 없습니다')).toBeInTheDocument()
    })
  })

  describe('커스텀 렌더링', () => {
    it('커스텀 render 함수가 올바르게 동작한다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
        />
      )
      
      expect(screen.getByText('활성')).toBeInTheDocument()
      expect(screen.getByText('비활성')).toBeInTheDocument()
      
      const activeStatus = screen.getByText('활성')
      const inactiveStatus = screen.getByText('비활성')
      
      expect(activeStatus).toHaveClass('text-green-600')
      expect(inactiveStatus).toHaveClass('text-red-600')
    })
  })

  describe('접근성 테스트', () => {
    it('접근성 규칙을 준수한다', async () => {
      const { container } = render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          caption="사용자 관리 테이블"
        />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('스크린 리더를 위한 적절한 aria 속성을 제공한다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          onRowClick={jest.fn()}
        />
      )
      
      const sortableHeader = screen.getByRole('button', { name: /이름 컬럼 정렬/ })
      expect(sortableHeader).toHaveAttribute('aria-sort', 'none')
      
      const clickableRow = screen.getByRole('button', { name: /테이블 행 1 선택/ })
      expect(clickableRow).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('변형 및 스타일링', () => {
    it('striped variant가 올바르게 적용된다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          variant="striped"
        />
      )
      
      // 스트라이프 패턴이 적용되는지는 CSS 클래스로 확인
      const rows = screen.getAllByRole('row')
      const dataRows = rows.slice(1) // 헤더 제외
      
      expect(dataRows[0]).toHaveClass('bg-neutral-25')
      expect(dataRows[1]).toHaveClass('bg-white')
    })

    it('density prop이 올바르게 적용된다', () => {
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={mockData}
          density="compact"
        />
      )
      
      const firstCell = screen.getAllByRole('cell')[0]
      expect(firstCell).toHaveClass('px-3', 'py-2')
    })
  })

  describe('에러 케이스', () => {
    it('잘못된 rowKey가 제공되어도 오류없이 렌더링한다', () => {
      const dataWithoutId = [{ name: 'Test' }]
      
      render(
        <AdminTable
          columns={[{ key: 'name', title: '이름' }]}
          dataSource={dataWithoutId}
        />
      )
      
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('undefined 데이터 값을 올바르게 처리한다', () => {
      const dataWithUndefined = [{ id: 1, name: undefined, role: 'Admin' }]
      
      render(
        <AdminTable
          columns={mockColumns}
          dataSource={dataWithUndefined}
        />
      )
      
      // undefined 값은 빈 문자열로 렌더링되어야 함
      const cells = screen.getAllByRole('cell')
      expect(cells[1]).toHaveTextContent('') // name 컬럼
    })
  })
})