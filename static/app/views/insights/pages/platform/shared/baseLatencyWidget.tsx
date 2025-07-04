import {useMemo} from 'react';

import {openInsightChartModal} from 'sentry/actionCreators/modal';
import {t} from 'sentry/locale';
import useOrganization from 'sentry/utils/useOrganization';
import {Line} from 'sentry/views/dashboards/widgets/timeSeriesWidget/plottables/line';
import {TimeSeriesWidgetVisualization} from 'sentry/views/dashboards/widgets/timeSeriesWidget/timeSeriesWidgetVisualization';
import {Widget} from 'sentry/views/dashboards/widgets/widget/widget';
import {Mode} from 'sentry/views/explore/contexts/pageParamsContext/mode';
import {ChartType} from 'sentry/views/insights/common/components/chart';
import type {LoadableChartWidgetProps} from 'sentry/views/insights/common/components/widgets/types';
import {useEAPSeries} from 'sentry/views/insights/common/queries/useDiscoverSeries';
import {convertSeriesToTimeseries} from 'sentry/views/insights/common/utils/convertSeriesToTimeseries';
import {usePageFilterChartParams} from 'sentry/views/insights/pages/platform/laravel/utils';
import {WidgetVisualizationStates} from 'sentry/views/insights/pages/platform/laravel/widgetVisualizationStates';
import {useReleaseBubbleProps} from 'sentry/views/insights/pages/platform/shared/getReleaseBubbleProps';
import {ModalChartContainer} from 'sentry/views/insights/pages/platform/shared/styles';
import {Toolbar} from 'sentry/views/insights/pages/platform/shared/toolbar';
import {useTransactionNameQuery} from 'sentry/views/insights/pages/platform/shared/useTransactionNameQuery';

interface BaseLatencyWidgetProps extends LoadableChartWidgetProps {
  referrer: string;
  title: string;
  baseQuery?: string;
}

export default function BaseLatencyWidget({
  title,
  baseQuery,
  referrer,
  ...props
}: BaseLatencyWidgetProps) {
  const organization = useOrganization();
  const {query} = useTransactionNameQuery();
  const pageFilterChartParams = usePageFilterChartParams({
    pageFilters: props.pageFilters,
  });
  const releaseBubbleProps = useReleaseBubbleProps(props);

  const fullQuery = `${baseQuery} ${query}`.trim();

  const {data, isLoading, error} = useEAPSeries(
    {
      ...pageFilterChartParams,
      search: fullQuery,
      yAxis: ['avg(span.duration)', 'p95(span.duration)'],
    },
    referrer,
    props.pageFilters
  );

  const plottables = useMemo(() => {
    return Object.keys(data).map(key => {
      const series = data[key as keyof typeof data];
      return new Line(convertSeriesToTimeseries(series));
    });
  }, [data]);

  const isEmpty = plottables.every(plottable => plottable.isEmpty);

  const visualization = (
    <WidgetVisualizationStates
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      VisualizationType={TimeSeriesWidgetVisualization}
      visualizationProps={{
        id: props.id,
        plottables,
        ...props,
        ...releaseBubbleProps,
      }}
    />
  );

  return (
    <Widget
      Title={<Widget.WidgetTitle title={title} />}
      Visualization={visualization}
      Actions={
        organization.features.includes('visibility-explore-view') &&
        !isEmpty && (
          <Toolbar
            showCreateAlert
            referrer={referrer}
            exploreParams={{
              mode: Mode.SAMPLES,
              visualize: [
                {
                  chartType: ChartType.LINE,
                  yAxes: ['avg(span.duration)', 'p95(span.duration)'],
                },
              ],
              query: fullQuery,
              interval: pageFilterChartParams.interval,
            }}
            loaderSource={props.loaderSource}
            onOpenFullScreen={() => {
              openInsightChartModal({
                title: t('API Latency'),
                children: <ModalChartContainer>{visualization}</ModalChartContainer>,
              });
            }}
          />
        )
      }
    />
  );
}
