import {Fragment, useEffect, useMemo} from 'react';
import styled from '@emotion/styled';
import isEqual from 'lodash/isEqual';

import AnalyticsArea from 'sentry/components/analyticsArea';
import ArchivedBox from 'sentry/components/archivedBox';
import GroupEventDetailsLoadingError from 'sentry/components/errors/groupEventDetailsLoadingError';
import {withMeta} from 'sentry/components/events/meta/metaProxy';
import * as Layout from 'sentry/components/layouts/thirds';
import LoadingError from 'sentry/components/loadingError';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import ResolutionBox from 'sentry/components/resolutionBox';
import useSentryAppComponentsData from 'sentry/stores/useSentryAppComponentsData';
import {space} from 'sentry/styles/space';
import type {GroupActivityReprocess, GroupReprocessing} from 'sentry/types/group';
import {defined} from 'sentry/utils';
import {getConfigForIssueType} from 'sentry/utils/issueTypeConfig';
import {VisuallyCompleteWithData} from 'sentry/utils/performanceForSentry';
import {useLocation} from 'sentry/utils/useLocation';
import {useMemoWithPrevious} from 'sentry/utils/useMemoWithPrevious';
import {useNavigate} from 'sentry/utils/useNavigate';
import useOrganization from 'sentry/utils/useOrganization';
import {useParams} from 'sentry/utils/useParams';
import usePrevious from 'sentry/utils/usePrevious';
import useProjectFromSlug from 'sentry/utils/useProjectFromSlug';
import GroupEventDetailsContent from 'sentry/views/issueDetails/groupEventDetails/groupEventDetailsContent';
import {GroupEventDetailsLoading} from 'sentry/views/issueDetails/groupEventDetails/groupEventDetailsLoading';
import GroupEventHeader from 'sentry/views/issueDetails/groupEventHeader';
import GroupSidebar from 'sentry/views/issueDetails/groupSidebar';
import ReprocessingProgress from 'sentry/views/issueDetails/reprocessingProgress';
import {useGroup} from 'sentry/views/issueDetails/useGroup';
import {useGroupEvent} from 'sentry/views/issueDetails/useGroupEvent';
import {
  getEventEnvironment,
  getGroupMostRecentActivity,
  getGroupReprocessingStatus,
  ReprocessingStatus,
  useEnvironmentsFromUrl,
  useHasStreamlinedUI,
} from 'sentry/views/issueDetails/utils';

function GroupEventDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const organization = useOrganization();
  const params = useParams<{groupId: string; orgId: string; eventId?: string}>();
  const environments = useEnvironmentsFromUrl();

  const {
    data: event,
    isPending: isLoadingEvent,
    isError: isEventError,
    refetch: refetchEvent,
  } = useGroupEvent({
    groupId: params.groupId,
    eventId: params.eventId,
  });

  const {
    data: group,
    isPending: isGroupPending,
    isError: isGroupError,
    refetch: refetchGroup,
  } = useGroup({groupId: params.groupId});

  const eventWithMeta = useMemo(() => withMeta(event), [event]);
  const project = useProjectFromSlug({organization, projectSlug: group?.project?.slug});
  const prevEnvironment = usePrevious(environments);
  const prevEvent = useMemoWithPrevious<typeof event | null>(
    previousInstance => {
      if (event) {
        return event;
      }
      return previousInstance;
    },
    [event]
  );
  const hasStreamlinedUI = useHasStreamlinedUI();

  // load the data
  useSentryAppComponentsData({projectId: project?.id});

  // If environments are being actively changed and will no longer contain the
  // current event's environment, redirect to latest
  useEffect(() => {
    const environmentsHaveChanged = !isEqual(prevEnvironment, environments);
    // If environments are being actively changed and will no longer contain the
    // current event's environment, redirect to latest
    if (
      environmentsHaveChanged &&
      prevEvent &&
      params.eventId &&
      !['latest', 'oldest'].includes(params.eventId)
    ) {
      const environment = getEventEnvironment(prevEvent);
      const shouldRedirect =
        environments.length > 0 && (!environment || !environments.includes(environment));

      if (shouldRedirect) {
        navigate(
          {
            pathname: `/organizations/${organization.slug}/issues/${params.groupId}/`,
            query: location.query,
          },
          {replace: true}
        );
        return;
      }
    }
  }, [
    prevEnvironment,
    environments,
    location.query,
    organization.slug,
    params,
    prevEvent,
    navigate,
  ]);

  // Group and project should already be loaded, but we can render a loading state if it's not
  if (isGroupPending || !project) {
    if (hasStreamlinedUI) {
      return <GroupEventDetailsLoading />;
    }

    return <LoadingIndicator />;
  }

  if (isGroupError) {
    return <LoadingError onRetry={refetchGroup} />;
  }

  const renderGroupStatusBanner = () => {
    if (group.status === 'ignored') {
      return (
        <GroupStatusBannerWrapper>
          <ArchivedBox
            substatus={group.substatus}
            statusDetails={group.statusDetails}
            organization={organization}
          />
        </GroupStatusBannerWrapper>
      );
    }

    if (group.status === 'resolved') {
      return (
        <GroupStatusBannerWrapper>
          <ResolutionBox
            statusDetails={group.statusDetails}
            activities={group.activity}
            project={project}
            organization={organization}
          />
        </GroupStatusBannerWrapper>
      );
    }

    return null;
  };

  const renderContent = () => {
    if (isLoadingEvent) {
      return hasStreamlinedUI ? <GroupEventDetailsLoading /> : <LoadingIndicator />;
    }

    // The streamlined UI uses a different error interface
    if (isEventError && !hasStreamlinedUI) {
      return (
        <GroupEventDetailsLoadingError
          environments={environments}
          onRetry={() => {
            refetchEvent();
            refetchGroup();
          }}
        />
      );
    }

    return (
      <GroupEventDetailsContent group={group} event={eventWithMeta} project={project} />
    );
  };

  const issueTypeConfig = getConfigForIssueType(group, project);
  const LayoutBody = hasStreamlinedUI ? 'div' : StyledLayoutBody;
  const MainLayoutComponent = hasStreamlinedUI ? 'div' : StyledLayoutMain;
  const groupReprocessingStatus = getGroupReprocessingStatus(group);

  return (
    <AnalyticsArea name="issue_details">
      <VisuallyCompleteWithData
        id="IssueDetails-EventBody"
        hasData={!isLoadingEvent && !isEventError && defined(eventWithMeta)}
        isLoading={isLoadingEvent}
      >
        <LayoutBody data-test-id="group-event-details">
          {groupReprocessingStatus === ReprocessingStatus.REPROCESSING ? (
            <ReprocessingProgress
              totalEvents={
                (getGroupMostRecentActivity(group.activity) as GroupActivityReprocess)
                  .data.eventCount
              }
              pendingEvents={
                (group.statusDetails as GroupReprocessing['statusDetails']).pendingEvents
              }
            />
          ) : (
            <Fragment>
              <MainLayoutComponent>
                {!hasStreamlinedUI && renderGroupStatusBanner()}
                {eventWithMeta && issueTypeConfig.stats.enabled && !hasStreamlinedUI && (
                  <GroupEventHeader
                    group={group}
                    event={eventWithMeta}
                    project={project}
                  />
                )}
                {renderContent()}
              </MainLayoutComponent>
              {hasStreamlinedUI ? null : (
                <StyledLayoutSide>
                  <GroupSidebar
                    organization={organization}
                    project={project}
                    group={group}
                    event={eventWithMeta}
                    environments={environments}
                  />
                </StyledLayoutSide>
              )}
            </Fragment>
          )}
        </LayoutBody>
      </VisuallyCompleteWithData>
    </AnalyticsArea>
  );
}

const StyledLayoutBody = styled(Layout.Body)`
  /* Makes the borders align correctly */
  padding: 0 !important;
  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    align-content: stretch;
  }
`;

const GroupStatusBannerWrapper = styled('div')`
  margin-bottom: ${space(2)};
`;

const StyledLayoutMain = styled(Layout.Main)`
  padding-top: ${space(2)};

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    padding-top: ${space(1)};
  }

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    border-right: 1px solid ${p => p.theme.border};
    padding-right: 0;
  }
`;

const StyledLayoutSide = styled(Layout.Side)`
  padding: ${space(3)} ${space(2)} ${space(3)};

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    padding-right: ${space(4)};
  }

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    padding-left: 0;
  }
`;

export default GroupEventDetails;
