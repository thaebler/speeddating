import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Chart,
  ChartData,
  registerables,
  TooltipItem,
  TooltipModel
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DatingEventData, SeatingService } from '../seating.service';

@Component({
  selector: 'app-seating-chart',
  templateUrl: './seating-chart.component.html',
  styleUrls: ['./seating-chart.component.css']
})
export class SeatingChartComponent implements AfterViewInit {
  chart: Chart | null = null;

  @ViewChild('chart')
  canvas!: ElementRef;

  eventData?: DatingEventData;

  minScaleY = 0;

  constructor(
    public seatingService: SeatingService,
    private translate: TranslateService
  ) {}

  ngAfterViewInit() {
    Chart.register(...registerables, ChartDataLabels);
    this.translate.onLangChange.subscribe(() => {
      if (!this.eventData) {
        this.seatingService.data.subscribe((data) => this.renderChart(data));
      } else {
        this.renderChart(this.eventData);
      }
    });
  }

  onStart(): void {
    this.seatingService.start();
  }

  onRotate(): void {
    this.seatingService.rotate();
  }

  private renderChart(eventData: DatingEventData) {
    this.eventData = eventData;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (eventData.dates.length > 0) {
      const data: ChartData<'bar', any[], any> =
        this.createChartData(eventData);
      this.chart = this.createChart(data, eventData);
    }
  }

  private createChartData(
    eventData: DatingEventData
  ): ChartData<'bar', (number | undefined)[], any> {
    const ageDifferenceLabel = this.translate.instant('ageDifference');
    return {
      labels: eventData.dates.map((eventData) => {
        if (eventData.tableNumber) {
          return `${this.translate.instant('table')} ${eventData.tableNumber}`;
        }
        return this.translate.instant('break');
      }),
      datasets: [
        {
          label: this.translate.instant('ladies'),
          data: eventData.dates.map((date) => date.lady?.age),
          borderColor: '#ff6699',
          backgroundColor: '#ff6699'
        },
        {
          label: this.translate.instant('men'),
          data: eventData.dates.map((date) => date.man?.age),
          borderColor: '#3399ff',
          backgroundColor: '#3399ff'
        },
        {
          label: ageDifferenceLabel,
          data: eventData.dates.map((date) => {
            if (date.man && date.lady) {
              return date.man.age - date.lady.age;
            }
            return 0;
          }),
          borderColor: '#00cc66',
          backgroundColor: '#00cc66'
        }
      ]
    };
  }

  private createChart(
    data: ChartData<'bar', (number | undefined)[], any>,
    eventData: DatingEventData
  ): Chart {
    this.minScaleY = Math.min(
      ...(data.datasets[2].data as number[]),
      this.minScaleY
    );
    const ageDifferenceLabel = this.translate.instant('ageDifference');
    const ctx = this.canvas.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;
    return new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function (
                this: TooltipModel<'bar'>,
                tooltipItem: TooltipItem<'bar'>
              ): string | string[] {
                const lady = eventData.dates[tooltipItem.dataIndex].lady;
                const man = eventData.dates[tooltipItem.dataIndex].man;
                if (lady && tooltipItem.datasetIndex === 0) {
                  return `${lady.firstName}: ${lady.age}`;
                } else if (man && tooltipItem.datasetIndex === 1) {
                  return `${man.firstName}: ${man.age}`;
                } else if (lady && man && tooltipItem.datasetIndex === 2) {
                  const dataset =
                    this.dataPoints[tooltipItem.datasetIndex].dataset.data;
                  return `${ageDifferenceLabel}: ${
                    dataset[tooltipItem.dataIndex]
                  }`;
                }
                return '';
              }
            }
          },
          datalabels: {
            align: 'end',
            anchor: 'end',
            rotation: 270,
            font: function (context) {
              return {
                size: 11,
                weight: 'bold'
              };
            },
            formatter: function (value, context) {
              if (context.datasetIndex === 0) {
                return eventData.dates[context.dataIndex].lady?.firstName;
              } else if (context.datasetIndex === 1) {
                return eventData.dates[context.dataIndex].man?.firstName;
              }
              return value;
            }
          },
          title: {
            display: true,
            text: `${this.translate.instant('date')} ${
              eventData.dateNumber
            } / ${eventData.noOfDates}`
          }
        },
        scales: {
          y: {
            min: this.minScaleY,
            max: eventData.maxAge + 30
          }
        }
      }
    }) as Chart;
  }
}
