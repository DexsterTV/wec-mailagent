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

export type FieldType = 'text' | 'textarea' | 'image-url' | 'boolean' | 'contact-select' | 'color'

export interface TemplateField {
  id: string
  label: string
  type: FieldType
  default?: string
  section?: string
  subsection?: string
  visibleIf?: string
  autofill?: string
  required?: boolean
  locked?: boolean
}

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'border' | 'other'

export interface DetectedColor {
  hex: string
  primaryProperty?: string
  rawForms: string[]
  count: number
  properties: string[]
  role: ColorRole
  label: string
  isNeutral: boolean
  // Per-occurrence fields (only set when extracted with extractColorsPerOccurrence):
  position?: number   // absolute byte offset in HTML where this color value starts
  rawForm?: string    // exact raw string at that position (e.g. "#FF0000" or "rgb(255,0,0)")
}

export interface DetectedFont {
  family: string
  rawForms: string[]
  count: number
}

export interface DetectedTypographyValue {
  property: 'font-size' | 'line-height' | 'letter-spacing'
  value: string
  rawForms: string[]
  count: number
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
  colorMappings?: DetectedColor[]
  fontMappings?: DetectedFont[]
  typographyMappings?: DetectedTypographyValue[]
  createdBy?: string
  createdAt?: string
}

// ── Płatne współprace ──────────────────────────────────────────────────────────
export type CollaborationStatus = 'PLANOWANA' | 'ZREALIZOWANA' | 'ANULOWANA'
export type PriceType = 'NETTO' | 'BRUTTO'

export interface Brand {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export interface CollaborationType {
  id: string
  name: string
  slug: string
  sortOrder: number
  active: boolean
}

export interface Outlet {
  id: string
  name: string
  active: boolean
  createdBy?: string
  createdAt: string
}

export interface PriceListEntry {
  id: string
  outletId: string
  collaborationTypeId: string
  priceGrosze: number
  priceType: PriceType
  note: string | null
  createdBy?: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
}

export interface Collaboration {
  id: string
  brandId: string
  outletId: string
  collaborationTypeId: string
  priceGrosze: number       // snapshot ceny w groszach
  priceType: PriceType
  status: CollaborationStatus
  plannedDate: string | null
  completedDate: string | null
  link: string | null
  note: string | null
  createdBy?: string
  createdAt: string
  updatedAt: string
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
  | 'WSP_BRAND_ADD'
  | 'WSP_BRAND_EDIT'
  | 'WSP_OUTLET_ADD'
  | 'WSP_OUTLET_EDIT'
  | 'WSP_TYPE_ADD'
  | 'WSP_TYPE_EDIT'
  | 'WSP_PRICE_ADD'
  | 'WSP_PRICE_UPDATE'
  | 'WSP_PRICE_DELETE'
  | 'WSP_COLLAB_ADD'
  | 'WSP_COLLAB_EDIT'
  | 'WSP_CSV_EXPORT'
  | string

export interface LogEntry {
  id: string
  timestamp: string
  user: string
  action: LogAction
  details?: string
}

export type LoginResponse = AuthUser
