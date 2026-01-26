'use client';

import { useState } from 'react';
import { Download, ChevronDown, FileText } from 'lucide-react';
import styles from './Contracts.module.css';
import type { ExportFormat } from './types';

interface ExportDropdownProps {
    onExport: (format: ExportFormat) => void;
}

export default function ExportDropdown({ onExport }: ExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={styles.exportDropdown}>
            <button
                className="btn btn-secondary"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Download size={16} aria-hidden="true" /> Exporter <ChevronDown size={14} aria-hidden="true" />
            </button>
            {isOpen && (
                <>
                    <div className={styles.dropdownOverlay} onClick={() => setIsOpen(false)} />
                    <div className={styles.dropdownMenu}>
                        <button onClick={() => { onExport('PDF'); setIsOpen(false); }}>
                            <FileText size={14} aria-hidden="true" /> PDF
                        </button>
                        <button onClick={() => { onExport('EXCEL'); setIsOpen(false); }}>
                            <FileText size={14} aria-hidden="true" /> Excel
                        </button>
                        <button onClick={() => { onExport('ACQUEREURS'); setIsOpen(false); }}>
                            <FileText size={14} aria-hidden="true" /> Acquéreurs
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
