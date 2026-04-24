import type { Template } from '../../types'

interface MergeTemplateMetadataOptions {
  nextTemplate: Template
  existingTemplate?: Template
  defaultTemplate?: Template
  currentUser?: string
}

export function mergeTemplateMetadata({
  nextTemplate,
  existingTemplate,
  defaultTemplate,
  currentUser,
}: MergeTemplateMetadataOptions): Template {
  const merged: Template = {
    ...nextTemplate,
    createdBy:
      nextTemplate.createdBy ??
      existingTemplate?.createdBy ??
      currentUser ??
      'Nieznany',
    createdAt:
      nextTemplate.createdAt ??
      existingTemplate?.createdAt ??
      new Date().toISOString(),
  }

  const version =
    nextTemplate._v ??
    existingTemplate?._v ??
    defaultTemplate?._v

  if (version !== undefined) {
    merged._v = version
  }

  return merged
}
