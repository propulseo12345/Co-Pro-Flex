/**
 * E2E Tests for AG Draft Resume (MICRO-PASS A3)
 *
 * Tests that verify:
 * 1. current_step persistence in ag_meetings table
 * 2. Dashboard navigation uses current_step from DB
 * 3. Page reload preserves step and form values
 * 4. Autosave indicator works correctly
 *
 * Prerequisites:
 * - Authenticated user session
 * - Active copropriété selected in CoproContext
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_PREFIX = 'E2E_DRAFT_RESUME_';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

async function cleanupTestData() {
  const supabase = getAdminClient();
  const { data: meetings } = await supabase
    .from('ag_meetings')
    .select('id')
    .like('title', `${TEST_PREFIX}%`);

  if (meetings && meetings.length > 0) {
    for (const meeting of meetings) {
      await supabase.rpc('delete_ag_draft', { p_ag_id: meeting.id });
    }
  }
}

async function verifyCurrentStepInDb(agId: string, expectedStep: number) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('ag_meetings')
    .select('current_step')
    .eq('id', agId)
    .single();

  expect(error).toBeNull();
  expect(data?.current_step).toBe(expectedStep);
  return data;
}

test.describe('AG Draft Resume - current_step Persistence', () => {
  let agId: string;
  const testTitle = `${TEST_PREFIX}${Date.now()}`;

  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1. Create draft, fill step 1, navigate to step 3, reload -> should remain at step 3', async ({ page }) => {
    // Navigate to AG creation
    await page.goto('/ag/new');

    // Fill step 1 form
    await page.fill('[data-testid="ag-title"]', testTitle);
    await page.selectOption('[data-testid="ag-type"]', 'ordinary');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    await page.fill('[data-testid="ag-date"]', futureDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="ag-location"]', 'Salle Test Resume');

    // Submit step 1 -> should navigate to step 2 (agenda)
    await page.click('[data-testid="ag-submit"]');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/agenda/);

    // Extract AG ID
    const url = page.url();
    const match = url.match(/\/ag\/([a-f0-9-]+)\//);
    expect(match).toBeTruthy();
    agId = match![1];

    // Verify current_step is 2 in DB
    await verifyCurrentStepInDb(agId, 2);

    // Add a resolution (step 2)
    await page.click('[data-testid="add-resolution-btn"]');
    await page.fill('[data-testid="resolution-title"]', 'Resolution Resume Test');
    await page.fill('[data-testid="resolution-text"]', 'Test description');
    await page.click('[data-testid="save-resolution-btn"]');
    await page.waitForSelector('text=Resolution Resume Test');

    // Navigate to step 3 (convocation)
    await page.click('[data-testid="continue-btn"]');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/convocation/);

    // Verify current_step is 3 in DB
    await verifyCurrentStepInDb(agId, 3);

    // Clear localStorage to ensure DB is source of truth
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith('ag-'))
        .forEach(key => localStorage.removeItem(key));
    });

    // Reload page
    await page.reload();

    // Should still be on convocation page
    expect(page.url()).toContain('/convocation');

    // Verify convocation content loads from DB
    await page.waitForSelector('[data-testid="convocation-preview"]');
  });

  test('2. Navigate to step 5, close, reopen via dashboard -> should return to step 5', async ({ page }) => {
    test.skip(!agId, 'Requires AG from test 1');

    // Continue from step 3 to step 4 (envoi)
    await page.goto(`/ag/${agId}/convocation`);
    await page.click('[data-testid="continue-btn"]');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/envoi/);

    // Verify current_step is 4
    await verifyCurrentStepInDb(agId, 4);

    // Continue to step 5 (preparation)
    await page.click('[data-testid="continue-btn"]');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/preparation/);

    // Verify current_step is 5
    await verifyCurrentStepInDb(agId, 5);

    // Clear localStorage
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith('ag-'))
        .forEach(key => localStorage.removeItem(key));
    });

    // Navigate away to dashboard
    await page.goto('/ag/dashboard');
    await page.waitForSelector('[data-testid="drafts-list"]');

    // Find our draft and click "Continuer"
    const draftRow = page.locator(`text=${testTitle}`).first();
    await expect(draftRow).toBeVisible();

    // Click the continue action for this draft
    const continueBtn = page.locator(`[data-testid="draft-continue-${agId}"], [href*="/ag/${agId}"]`).first();
    await continueBtn.click();

    // Should navigate to step 5 (preparation), not step 1 (edit)
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/preparation/);
    expect(page.url()).toContain('/preparation');
  });

  test('3. Autosave indicator should show "Saved" after data change', async ({ page }) => {
    test.skip(!agId, 'Requires AG from previous tests');

    // Navigate to edit page
    await page.goto(`/ag/${agId}/edit`);

    // Wait for page load
    await page.waitForSelector('[data-testid="ag-form"]');

    // Change a field value (e.g., location)
    const locationField = page.locator('[data-testid="ag-location"]');
    await locationField.clear();
    await locationField.fill('Salle modifiee pour autosave');

    // Wait for autosave indicator
    // The indicator might show "Enregistrement..." then "Enregistre"
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/Enregistr|Saved/i, {
      timeout: 5000,
    });
  });
});

test.describe('AG Draft Resume - Dashboard Navigation', () => {
  test('Dashboard should show drafts with correct step navigation links', async ({ page }) => {
    // Navigate to AG dashboard
    await page.goto('/ag/dashboard');

    // Wait for drafts section
    await page.waitForSelector('[data-testid="drafts-section"]', { timeout: 10000 });

    // Get all draft items
    const draftItems = page.locator('[data-testid^="draft-item-"]');
    const count = await draftItems.count();

    if (count > 0) {
      // First draft should have a continue link
      const firstDraft = draftItems.first();
      const continueLink = firstDraft.locator('a[href*="/ag/"]').first();

      // Get the href and verify it includes a step path
      const href = await continueLink.getAttribute('href');
      expect(href).toBeTruthy();

      // Href should point to a specific step, not just /ag/[id]
      // Valid paths: edit, agenda, convocation, envoi, preparation, session, pv
      const validStepPaths = ['edit', 'agenda', 'convocation', 'envoi', 'preparation', 'session', 'pv'];
      const hasValidStep = validStepPaths.some(step => href!.includes(`/${step}`));
      expect(hasValidStep).toBe(true);
    }
  });
});

test.describe('AG Step Transitions - DB current_step Updates', () => {
  test('Each step transition should update current_step in database', async ({ page }) => {
    const supabase = getAdminClient();
    const testTitle = `${TEST_PREFIX}STEPS_${Date.now()}`;

    // Create new draft via API for cleaner test
    const { data: newAg, error } = await supabase
      .from('ag_meetings')
      .insert({
        title: testTitle,
        meeting_type: 'ordinary',
        meeting_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        current_step: 1,
        copro_id: process.env.TEST_COPRO_ID!, // Set in test env
      })
      .select()
      .single();

    if (error) {
      test.skip(true, 'Could not create test AG');
      return;
    }

    const agId: string = newAg.id;

    try {
      // Navigate to step 1 (edit)
      await page.goto(`/ag/${agId}/edit`);

      // Verify current_step is 1
      await verifyCurrentStepInDb(agId, 1);

      // Fill required fields and submit to go to step 2
      await page.fill('[data-testid="ag-location"]', 'Test Location');
      await page.click('[data-testid="ag-submit"]');

      // Wait for navigation to step 2
      await page.waitForURL(/\/ag\/[a-f0-9-]+\/agenda/);

      // Verify current_step updated to 2
      await verifyCurrentStepInDb(agId, 2);

    } finally {
      // Cleanup
      await supabase.rpc('delete_ag_draft', { p_ag_id: agId });
    }
  });
});
