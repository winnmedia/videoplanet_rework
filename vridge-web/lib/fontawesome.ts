/**
 * FontAwesome 아이콘 설정
 * 사용할 아이콘들을 여기서 import하여 번들 크기 최적화
 */

import { library } from '@fortawesome/fontawesome-svg-core'
import {
  // 정규 스타일 아이콘들
  faUser,
  faClock,
  faHeart
} from '@fortawesome/free-regular-svg-icons'
import {
  // 네비게이션 및 인터페이스
  faHome,
  faCalendarDays,
  faVideo,
  faComments,
  faChartBar,
  faPlus,
  faEllipsisH,
  
  // 사용자 및 팀
  faUsers,
  faUserPlus,
  faEnvelope,
  faShare,
  
  // 액션 및 컨트롤
  faCheck,
  faTimes,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faBell,
  
  // 상태 표시
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  
  // 기타 유틸리티
  faSpinner,
  faChevronDown,
  faChevronRight,
  faChevronLeft,
  faEye,
  faEyeSlash,
  faCog,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons'


// 라이브러리에 아이콘 추가
library.add(
  // Solid icons
  faHome,
  faCalendarDays,
  faVideo,
  faComments,
  faChartBar,
  faPlus,
  faEllipsisH,
  faUsers,
  faUserPlus,
  faEnvelope,
  faShare,
  faCheck,
  faTimes,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faBell,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faChevronDown,
  faChevronRight,
  faChevronLeft,
  faEye,
  faEyeSlash,
  faCog,
  faSignOutAlt,
  
  // Regular icons
  faUser,
  faClock,
  faHeart
)