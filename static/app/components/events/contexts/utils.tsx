import {Fragment} from 'react';
import type {Theme} from '@emotion/react';
import styled from '@emotion/styled';
import type {Location} from 'history';
import moment from 'moment-timezone';
import logoUnknown from 'sentry-logos/logo-unknown.svg';

import {UserAvatar} from 'sentry/components/core/avatar/userAvatar';
import {DeviceName} from 'sentry/components/deviceName';
import {
  ContextIcon,
  type ContextIconProps,
  getLogoImage,
} from 'sentry/components/events/contexts/contextIcon';
import {getAppContextData} from 'sentry/components/events/contexts/knownContext/app';
import {getBrowserContextData} from 'sentry/components/events/contexts/knownContext/browser';
import {getCloudResourceContextData} from 'sentry/components/events/contexts/knownContext/cloudResource';
import {getCultureContextData} from 'sentry/components/events/contexts/knownContext/culture';
import {getDeviceContextData} from 'sentry/components/events/contexts/knownContext/device';
import {getGPUContextData} from 'sentry/components/events/contexts/knownContext/gpu';
import {getMemoryInfoContext} from 'sentry/components/events/contexts/knownContext/memoryInfo';
import {getMissingInstrumentationContextData} from 'sentry/components/events/contexts/knownContext/missingInstrumentation';
import {getOperatingSystemContextData} from 'sentry/components/events/contexts/knownContext/os';
import {getProfileContextData} from 'sentry/components/events/contexts/knownContext/profile';
import {getReplayContextData} from 'sentry/components/events/contexts/knownContext/replay';
import {getRuntimeContextData} from 'sentry/components/events/contexts/knownContext/runtime';
import {getStateContextData} from 'sentry/components/events/contexts/knownContext/state';
import {getThreadPoolInfoContext} from 'sentry/components/events/contexts/knownContext/threadPoolInfo';
import {getTraceContextData} from 'sentry/components/events/contexts/knownContext/trace';
import {getUserContextData} from 'sentry/components/events/contexts/knownContext/user';
import {
  getPlatformContextData,
  getPlatformContextIcon,
  getPlatformContextTitle,
  PLATFORM_CONTEXT_KEYS,
} from 'sentry/components/events/contexts/platformContext/utils';
import {userContextToActor} from 'sentry/components/events/interfaces/utils';
import StructuredEventData from 'sentry/components/structuredEventData';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import type {Event} from 'sentry/types/event';
import type {KeyValueListData, KeyValueListDataItem} from 'sentry/types/group';
import type {Organization} from 'sentry/types/organization';
import type {Project} from 'sentry/types/project';
import {defined} from 'sentry/utils';

/**
 * Generates the class name used for contexts
 */
export function generateIconName(
  name?: string | boolean | null,
  version?: string
): string {
  if (!defined(name) || typeof name === 'boolean') {
    return '';
  }

  const lowerCaseName = name.toLowerCase();

  // amazon fire tv device id changes with version: AFTT, AFTN, AFTS, AFTA, AFTVA (alexa), ...
  if (lowerCaseName.startsWith('aft')) {
    return 'amazon';
  }

  if (lowerCaseName.startsWith('sm-') || lowerCaseName.startsWith('st-')) {
    return 'samsung';
  }

  if (lowerCaseName.startsWith('moto')) {
    return 'motorola';
  }

  if (lowerCaseName.startsWith('pixel')) {
    return 'google';
  }

  if (lowerCaseName.startsWith('vercel')) {
    return 'vercel';
  }

  const formattedName = name
    .split(/\d/)[0]!
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/\-+$/, '')
    .replace(/^\-+/, '');

  if (formattedName === 'edge' && version) {
    const majorVersion = version.split('.')[0]!;
    const isLegacyEdge = majorVersion >= '12' && majorVersion <= '18';

    return isLegacyEdge ? 'legacy-edge' : 'edge';
  }

  if (formattedName.endsWith('-mobile')) {
    return formattedName.split('-')[0]!;
  }

  return formattedName;
}

export function getRelativeTimeFromEventDateCreated(
  eventDateCreated: string,
  timestamp?: string,
  showTimestamp = true
) {
  if (!defined(timestamp)) {
    return timestamp;
  }

  const dateTime = moment(timestamp);

  if (!dateTime.isValid()) {
    return timestamp;
  }

  const relativeTime = `(${dateTime.from(eventDateCreated, true)} ${t(
    'before this event'
  )})`;

  if (!showTimestamp) {
    return <RelativeTime>{relativeTime}</RelativeTime>;
  }

  return (
    <Fragment>
      {timestamp}
      <RelativeTime>{relativeTime}</RelativeTime>
    </Fragment>
  );
}

type KnownDataDetails = Omit<KeyValueListDataItem, 'key'> | undefined;

export function getKnownData<Data, DataType>({
  data,
  knownDataTypes,
  onGetKnownDataDetails,
  meta,
}: {
  data: Data;
  knownDataTypes: string[];
  onGetKnownDataDetails: (props: {data: Data; type: DataType}) => KnownDataDetails;
  meta?: Record<any, any>;
}): KeyValueListData {
  const filteredTypes = knownDataTypes.filter(knownDataType => {
    if (
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      typeof data[knownDataType] !== 'number' &&
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      typeof data[knownDataType] !== 'boolean' &&
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      !data[knownDataType]
    ) {
      return !!meta?.[knownDataType];
    }
    return true;
  });

  return filteredTypes
    .map(type => {
      const knownDataDetails = onGetKnownDataDetails({
        data,
        type: type as unknown as DataType,
      });

      if (!knownDataDetails) {
        return null;
      }

      return {
        key: type,
        ...knownDataDetails,
        value: knownDataDetails.value,
      };
    })
    .filter(defined);
}

export function getKnownStructuredData(
  knownData: KeyValueListData,
  meta: Record<string, any>
): KeyValueListData {
  return knownData.map(kd => ({
    ...kd,
    value: (
      <StructuredEventData data={kd.value} meta={meta?.[kd.key]} withAnnotatedText />
    ),
  }));
}

/**
 * Returns the type of a given context, after coercing from its type and alias.
 * - 'type' refers the the `type` key on it's data blob. This is usually overridden by the SDK for known types, but not always.
 * - 'alias' refers to the key on event.contexts. This can be set by the user, but we have to depend on it for some contexts.
 */
export function getContextType({alias, type}: {alias: string; type?: string}): string {
  if (!defined(type)) {
    return alias;
  }
  return type === 'default' ? alias : type;
}

/**
 * Omit certain keys from ever being displayed on context items.
 * All custom context (and some known context) has the type:default so we remove it.
 */
export function getContextKeys({
  data,
  hiddenKeys = [],
}: {
  data: Record<string, any>;
  hiddenKeys?: string[];
}): string[] {
  const hiddenKeySet = new Set(hiddenKeys);
  return Object.keys(data).filter(
    ctxKey => ctxKey !== 'type' && !hiddenKeySet.has(ctxKey)
  );
}

export function getContextTitle({
  alias,
  type,
  value = {},
}: {
  alias: string;
  type: string;
  value?: Record<string, any>;
}) {
  if (defined(value.title) && typeof value.title !== 'object') {
    return value.title;
  }

  const contextType = getContextType({alias, type});

  if (PLATFORM_CONTEXT_KEYS.has(contextType)) {
    return getPlatformContextTitle({platform: alias});
  }

  if (alias === 'client_os') {
    // To differentiate from `os` and avoid confusion with two items called "Operating System"
    return t('Client Operating System');
  }

  switch (contextType) {
    case 'app':
      return t('App');
    case 'device':
      return t('Device');
    case 'browser':
      return t('Browser');
    case 'response':
      return t('Response');
    case 'feedback':
      return t('Feedback');
    case 'os':
      return t('Operating System');
    case 'user':
      return t('User');
    case 'gpu':
      return t('Graphics Processing Unit');
    case 'runtime':
      return t('Runtime');
    case 'trace':
      return t('Trace Details');
    case 'otel':
      return 'OpenTelemetry';
    case 'cloud_resource':
      return t('Cloud Resource');
    case 'culture':
    case 'Current Culture':
      return t('Culture');
    case 'missing_instrumentation':
      return t('Missing OTEL Instrumentation');
    case 'unity':
      return 'Unity';
    case 'memory_info': // Current value for memory info
    case 'Memory Info': // Legacy for memory info
      return t('Memory Info');
    case 'threadpool_info': // Current value for thread pool info
    case 'ThreadPool Info': // Legacy value for thread pool info
      return t('Thread Pool Info');
    case 'state':
      return t('Application State');
    case 'laravel':
      return t('Laravel Context');
    case 'profile':
      return t('Profile');
    case 'replay':
      return t('Replay');
    case 'ota_updates':
      return t('OTA Updates');
    case 'react_native_context':
      return t('React Native');
    default:
      return contextType;
  }
}

export function getContextMeta(event: Event, contextType: string): Record<string, any> {
  const defaultMeta = event._meta?.contexts?.[contextType] ?? {};
  switch (contextType) {
    case 'memory_info': // Current
    case 'Memory Info': // Legacy
      return event._meta?.contexts?.['Memory Info'] ?? defaultMeta;
    case 'threadpool_info': // Current
    case 'ThreadPool Info': // Legacy
      return event._meta?.contexts?.['ThreadPool Info'] ?? defaultMeta;
    case 'user':
      return event._meta?.user ?? defaultMeta;
    default:
      return defaultMeta;
  }
}

export function getContextIcon({
  alias,
  type,
  value = {},
  contextIconProps = {},
  theme,
}: {
  alias: string;
  theme: Theme;
  type: string;
  contextIconProps?: Partial<ContextIconProps>;
  value?: Record<string, any>;
}): React.ReactNode {
  const contextType = getContextType({alias, type});
  if (PLATFORM_CONTEXT_KEYS.has(contextType)) {
    return getPlatformContextIcon({
      platform: alias,
      size: contextIconProps?.size ?? 'xl',
    });
  }

  let iconName = '';
  switch (type) {
    case 'device':
      iconName = generateIconName(value?.model);
      break;
    case 'client_os':
    case 'os':
      iconName = generateIconName(value?.name);
      break;
    case 'runtime':
    case 'browser':
      iconName = generateIconName(value?.name, value?.version);
      break;
    case 'user': {
      const user = userContextToActor(value);
      const iconSize = theme.iconSizes[contextIconProps?.size ?? 'xl'];
      return <UserAvatar user={user} size={parseInt(iconSize, 10)} gravatar={false} />;
    }
    case 'gpu':
      iconName = generateIconName(value?.vendor_name ? value?.vendor_name : value?.name);
      break;
    default:
      break;
  }
  if (iconName.length === 0) {
    return null;
  }

  const imageName = getLogoImage(iconName);
  if (imageName === logoUnknown) {
    return null;
  }
  return <ContextIcon name={iconName} {...contextIconProps} />;
}

export function getFormattedContextData({
  event,
  contextType,
  contextValue,
  organization,
  project,
  location,
}: {
  contextType: string;
  contextValue: any;
  event: Event;
  location: Location;
  organization: Organization;
  project?: Project;
}): KeyValueListData {
  const meta = getContextMeta(event, contextType);

  if (PLATFORM_CONTEXT_KEYS.has(contextType)) {
    return getPlatformContextData({platform: contextType, data: contextValue});
  }

  switch (contextType) {
    case 'app':
      return getAppContextData({data: contextValue, event, meta});
    case 'device':
      return getDeviceContextData({data: contextValue, event, meta});
    case 'memory_info': // Current
    case 'Memory Info': // Legacy
      return getMemoryInfoContext({data: contextValue, meta});
    case 'browser':
      return getBrowserContextData({data: contextValue, meta});
    case 'os':
      return getOperatingSystemContextData({data: contextValue, meta});
    case 'runtime':
      return getRuntimeContextData({data: contextValue, meta});
    case 'user':
      return getUserContextData({data: contextValue, meta});
    case 'gpu':
      return getGPUContextData({data: contextValue, meta});
    case 'trace':
      return getTraceContextData({
        data: contextValue,
        event,
        meta,
        organization,
        location,
      });
    case 'threadpool_info': // Current
    case 'ThreadPool Info': // Legacy
      return getThreadPoolInfoContext({data: contextValue, meta});
    case 'state':
      return getStateContextData({data: contextValue, meta});
    case 'profile':
      return getProfileContextData({
        data: contextValue,
        event,
        meta,
        organization,
        project,
      });
    case 'replay':
      return getReplayContextData({data: contextValue, meta});
    case 'cloud_resource':
      return getCloudResourceContextData({data: contextValue, meta});
    case 'culture':
    case 'Current Culture':
      return getCultureContextData({data: contextValue, meta});
    case 'missing_instrumentation':
      return getMissingInstrumentationContextData({data: contextValue, meta});
    default:
      return getContextKeys({data: contextValue}).map(ctxKey => ({
        key: ctxKey,
        subject: ctxKey,
        value: contextValue[ctxKey],
        meta: meta?.[ctxKey]?.[''],
      }));
  }
}

function shortRuntimeVersion(version: string) {
  // Ruby runtime version looks like:
  // - `ruby 3.2.6 (2024-10-30 revision 63aeb018eb) [arm64-darwin23]`
  // - `ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin24]`
  if (version.startsWith('ruby') && version.length > 25) {
    // Extract everything from "ruby" until the first opening parenthesis
    // This will include both the version number and any patch level
    const match = version.match(/^ruby\s+(.*?)(?:\s+\(|$)/);
    return match ? match[1]?.trim() : version;
  }
  // TODO: handle other long runtime versions

  return version;
}

function shortOperatingSystemVersion(version: string) {
  // Darwin version looks like `Darwin Kernel Version 24.3.0: Thu Jan 2 20:24:24 PST 2025; root:xnu-11215.81.4~3/RELEASE_ARM64_T6030`
  if (version.startsWith('Darwin Kernel Version') && version.length > 25) {
    const match = version.match(/Darwin Kernel Version (\d+\.\d+\.\d+).+RELEASE_(.+)/);
    // Return just the version number and release type
    return match ? `${match[1]} (RELEASE_${match[2]})` : version;
  }
  // TODO: handle other long operating system versions

  return version;
}

/**
 * Reimplemented as util function from legacy summaries deleted in this PR - https://github.com/getsentry/sentry/pull/71695/files
 * Consildated into one function and neglects any meta annotations since those will be rendered in the proper contexts section.
 * The only difference is we don't render 'unknown' values, since that doesn't help the user.
 */
export function getContextSummary({
  type,
  value: data,
}: {
  type: string;
  value?: Record<string, any>;
}): {
  subtitle: React.ReactNode;
  title: React.ReactNode;
  subtitleType?: string;
} {
  let title: React.ReactNode = null;
  let subtitle: React.ReactNode = null;
  let subtitleType: string | undefined = undefined;
  switch (type) {
    case 'device':
      title = (
        <DeviceName value={data?.model ?? ''}>
          {deviceName => <span>{deviceName ? deviceName : data?.name}</span>}
        </DeviceName>
      );
      if (defined(data?.arch)) {
        subtitle = data?.arch;
        subtitleType = t('Architecture');
      } else if (defined(data?.model)) {
        subtitle = data?.model;
        subtitleType = t('Model');
      }
      break;

    case 'gpu':
      title = data?.name ?? null;
      if (defined(data?.vendor_name)) {
        subtitle = data?.vendor_name;
        subtitleType = t('Vendor');
      }
      break;

    case 'os':
    case 'client_os':
      title = data?.name ?? null;
      if (typeof data?.version === 'string') {
        subtitle = shortOperatingSystemVersion(data?.version);
        subtitleType = t('Version');
      } else if (defined(data?.kernel_version)) {
        subtitle = data?.kernel_version;
        subtitleType = t('Kernel');
      }
      break;

    case 'user':
      if (defined(data?.email)) {
        title = data?.email;
      }
      if (defined(data?.ip_address) && !title) {
        title = data?.ip_address;
      }
      if (defined(data?.id)) {
        title = title ? title : data?.id;
        subtitle = data?.id;
        subtitleType = t('ID');
      }
      if (defined(data?.username)) {
        title = title ? title : data?.username;
        subtitle = data?.username;
        subtitleType = t('Username');
      }
      if (title === subtitle) {
        return {
          title,
          subtitle: null,
        };
      }
      break;
    case 'runtime':
      title = data?.name ?? null;
      if (typeof data?.version === 'string') {
        subtitle = shortRuntimeVersion(data?.version);
        subtitleType = t('Version');
      }
      break;
    case 'browser':
      title = data?.name ?? null;
      if (defined(data?.version)) {
        subtitle = data?.version;
        subtitleType = t('Version');
      }
      break;
    default:
      break;
  }
  return {
    title,
    subtitle,
    subtitleType,
  };
}

const RelativeTime = styled('span')`
  color: ${p => p.theme.subText};
  margin-left: ${space(0.5)};
`;

export const CONTEXT_DOCS_LINK = `https://docs.sentry.io/platform-redirect/?next=/enriching-events/context/`;
