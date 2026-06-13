'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePVTemplates } from '@/hooks/modules/usePVTemplates';
import { useCopro } from '@/providers/CoproContext';
import { useSupabase } from '@/hooks/useSupabase';
import type { IPVTemplateSpec } from '@/types/models/pv-template';

export function useTemplateEditor(templateId: string) {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const { user } = useSupabase();

  const {
    selectedTemplate,
    isLoading,
    selectTemplate,
    updateTemplateSpec,
    updateSection,
    toggleSection,
    generatePreview,
    exportPV,
    downloadExport,
    getMockContext,
  } = usePVTemplates({ organizationId: currentCoproId ?? '', userId: user?.id ?? '' });

  const [activeTab, setActiveTab] = useState<'sections' | 'settings' | 'formulations'>('sections');
  const [showPreview, setShowPreview] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const contentEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { selectTemplate(templateId); }, [templateId, selectTemplate]);

  const updatePreview = useCallback(async () => {
    if (!templateId) return;
    const result = await generatePreview(templateId);
    setPreviewHtml(result.html);
    setPreviewErrors(result.errors);
  }, [templateId, generatePreview]);

  useEffect(() => {
    if (selectedTemplate && showPreview) updatePreview();
  }, [selectedTemplate, showPreview, updatePreview]);

  const handleToggleSection = useCallback((sectionId: string, enabled: boolean) => {
    toggleSection(templateId, sectionId, enabled);
    setHasChanges(true);
  }, [templateId, toggleSection]);

  const handleUpdateSectionContent = useCallback((sectionId: string, content: string) => {
    updateSection(templateId, sectionId, { content });
    setHasChanges(true);
  }, [templateId, updateSection]);

  const handleExpandSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const handleUpdateGlobal = useCallback((updates: Partial<IPVTemplateSpec['global']>) => {
    if (!selectedTemplate) return;
    updateTemplateSpec(templateId, { global: { ...selectedTemplate.spec.global, ...updates } });
    setHasChanges(true);
  }, [templateId, selectedTemplate, updateTemplateSpec]);

  const handleUpdateHeader = useCallback((updates: Partial<IPVTemplateSpec['header']>) => {
    if (!selectedTemplate) return;
    updateTemplateSpec(templateId, { header: { ...selectedTemplate.spec.header, ...updates } });
    setHasChanges(true);
  }, [templateId, selectedTemplate, updateTemplateSpec]);

  const handleUpdateFormulations = useCallback((updates: Partial<IPVTemplateSpec['formulations']>) => {
    if (!selectedTemplate) return;
    updateTemplateSpec(templateId, { formulations: { ...selectedTemplate.spec.formulations, ...updates } });
    setHasChanges(true);
  }, [templateId, selectedTemplate, updateTemplateSpec]);

  const handleInsertVariable = useCallback((variableKey: string) => {
    const textarea = contentEditorRef.current;
    if (!textarea || !editingSection) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const variable = `{{${variableKey}}}`;
    const newText = text.substring(0, start) + variable + text.substring(end);
    handleUpdateSectionContent(editingSection, newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }, [editingSection, handleUpdateSectionContent]);

  const handleExport = useCallback(async (format: 'html' | 'pdf' | 'docx') => {
    setExportLoading(true);
    try {
      const context = getMockContext();
      const result = await exportPV(templateId, context, { format });
      if (result.success) downloadExport(result);
    } finally {
      setExportLoading(false);
    }
  }, [templateId, getMockContext, exportPV, downloadExport]);

  const goBack = useCallback(() => router.push('/settings/templates'), [router]);

  return {
    selectedTemplate,
    isLoading,
    activeTab,
    setActiveTab,
    showPreview,
    setShowPreview,
    previewHtml,
    previewErrors,
    expandedSections,
    editingSection,
    setEditingSection,
    showVariables,
    setShowVariables,
    hasChanges,
    exportLoading,
    contentEditorRef,
    updatePreview,
    handleToggleSection,
    handleUpdateSectionContent,
    handleExpandSection,
    handleUpdateGlobal,
    handleUpdateHeader,
    handleUpdateFormulations,
    handleInsertVariable,
    handleExport,
    goBack,
  };
}
