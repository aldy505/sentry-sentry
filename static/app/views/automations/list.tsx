import {Fragment} from 'react';

import {Flex} from 'sentry/components/container/flex';
import {LinkButton} from 'sentry/components/core/button/linkButton';
import PageFiltersContainer from 'sentry/components/organizations/pageFilters/container';
import {ProjectPageFilter} from 'sentry/components/organizations/projectPageFilter';
import SearchBar from 'sentry/components/searchBar';
import SentryDocumentTitle from 'sentry/components/sentryDocumentTitle';
import {ActionsProvider} from 'sentry/components/workflowEngine/layout/actions';
import ListLayout from 'sentry/components/workflowEngine/layout/list';
import {useWorkflowEngineFeatureGate} from 'sentry/components/workflowEngine/useWorkflowEngineFeatureGate';
import {IconAdd} from 'sentry/icons';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import useOrganization from 'sentry/utils/useOrganization';
import AutomationListTable from 'sentry/views/automations/components/automationListTable';
import {makeAutomationBasePathname} from 'sentry/views/automations/pathnames';

export default function AutomationsList() {
  useWorkflowEngineFeatureGate({redirect: true});

  return (
    <SentryDocumentTitle title={t('Automations')} noSuffix>
      <PageFiltersContainer>
        <ActionsProvider actions={<Actions />}>
          <ListLayout>
            <TableHeader />
            <AutomationListTable />
          </ListLayout>
        </ActionsProvider>
      </PageFiltersContainer>
    </SentryDocumentTitle>
  );
}

function TableHeader() {
  return (
    <Flex gap={space(2)}>
      <ProjectPageFilter size="md" />
      <div style={{flexGrow: 1}}>
        <SearchBar placeholder={t('Search for events, users, tags, and more')} />
      </div>
    </Flex>
  );
}

function Actions() {
  const organization = useOrganization();
  return (
    <Fragment>
      <LinkButton
        to={`${makeAutomationBasePathname(organization.slug)}new/`}
        priority="primary"
        icon={<IconAdd />}
        size="sm"
      >
        {t('Create Automation')}
      </LinkButton>
    </Fragment>
  );
}
