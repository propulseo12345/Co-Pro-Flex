'use client';

import { useRecherchePage } from '@/features/communication/recherche/hooks';
import {
  SearchForm,
  TypeTabs,
  SearchResults,
} from '@/features/communication/recherche/components';
import styles from './recherche.module.css';

export default function RechercheGlobalePage() {
  const {
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    dateFilter,
    setDateFilter,
    authorFilter,
    setAuthorFilter,
    isSearching,
    filteredResults,
    resultTypes,
    handleSearch,
    clearFilters,
    getTypeIcon,
    getTypeLabel,
    getTypeColor,
    getResultCount,
  } = useRecherchePage();

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Recherche globale</h1>
          <p className={styles.subtitle}>
            Recherchez dans tous vos messages, mails, publications et événements
          </p>
        </div>
      </div>

      <SearchForm
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        authorFilter={authorFilter}
        onAuthorFilterChange={setAuthorFilter}
        resultTypes={resultTypes}
        onSubmit={handleSearch}
        onClearFilters={clearFilters}
      />

      <TypeTabs
        resultTypes={resultTypes}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        getResultCount={getResultCount}
      />

      <SearchResults
        results={filteredResults}
        isSearching={isSearching}
        getTypeIcon={getTypeIcon}
        getTypeLabel={getTypeLabel}
        getTypeColor={getTypeColor}
      />
    </div>
  );
}
