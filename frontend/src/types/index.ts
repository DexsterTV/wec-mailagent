export interface Permissions {
  canEditTemplates?: boolean
  canManageContacts?: boolean
}

export interface User {
  username: string
  displayName: string
  role: 'admin' | 'user'
  permissions: Permissions
  email?: string | null
  picture?: string | null
  authProviders?: string[]
}

export interface AuthUser extends User {
  token: string
}

export type FieldType = 'text' | 'textarea' | 'image-url' | 'boolean' | 'contact-select'

export interface TemplateField {
  id: string
  label: string
  type: FieldType
  default?: string
  section?: string
  visibleIf?: string
  autofill?: string
  required?: boolean
  locked?: boolean
}

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'border' | 'other'

export interface DetectedColor {
  hex: string
  rawForms: string[]
  count: number
  properties: string[]
  role: ColorRole
  label: string
  isNeutral: boolean
}

export type PressRole =
  | 'press_title'
  | 'press_hero_image'
  | 'press_cta_button'
  | 'press_cta_link'
  | 'press_excerpt'
  | 'press_date'
  | 'press_secondary_image'
  | 'press_secondary_cta'
  | 'press_category'
  | 'press_source_link'

export interface PressMapEntry {
  id: string
  selector: string
  role: PressRole
  label: string
  instance: 1 | 2
}

export interface Template {
  id: string
  name: string
  _v?: number
  fields: TemplateField[]
  html: string
  pressMappings?: PressMapEntry[]
  docxButtonSelector?: string
  createdBy?: string
  createdAt?: string
}

export interface ProwlyPost {
  id: string
  title: string
  link: string
  image: string | null
  pubDate: string | null
}

export interface Contact {
  id: string
  name: string
  position?: string
  email?: string
  phone?: string
}

export type LogAction =
  | 'LOGIN'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'EXPORT_COPY'
  | 'EXPORT_DOWNLOAD'
  | 'TEMPLATE_SAVE'
  | 'TEMPLATE_DELETE'
  | 'CONTACT_ADD'
  | 'CONTACT_EDIT'
  | 'CONTACT_DELETE'
  | 'USER_ADD'
  | 'USER_EDIT'
  | 'USER_DELETE'
  | string

export interface LogEntry {
  id: string
  timestamp: string
  user: string
  action: LogAction
  details?: string
}

export type LoginResponse = AuthUser
