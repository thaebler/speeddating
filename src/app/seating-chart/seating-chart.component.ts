import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Chart, registerables, TooltipItem, TooltipModel } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DatingEventData, SeatingService } from '../seating.service';

@Component({
  selector: 'app-seating-chart',
  templateUrl: './seating-chart.component.html',
  styleUrls: ['./seating-chart.component.css']
})
export class SeatingChartComponent implements AfterViewInit {
  chart?: Chart;

  @ViewChild('chart')
  canvas!: ElementRef;

  chartData?: DatingEventData;

  constructor(
    public seatingService: SeatingService,
    private translate: TranslateService
  ) {}

  ngAfterViewInit() {
    Chart.register(...registerables, ChartDataLabels);
    this.translate.onLangChange.subscribe(() => {
      if (!this.chartData) {
        this.seatingService.data.subscribe((data) => this.renderChart(data));
      } else {
        this.renderChart(this.chartData);
      }
    });
  }

  onStart(): void {
    this.seatingService.start();
  }

  onRotate(): void {
    this.seatingService.rotate();
  }

  private renderChart(data: DatingEventData) {
    this.chartData = data;
    const ageDifferenceLabel = this.translate.instant('ageDifference');
    const ctx = this.canvas.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;
    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.dates.map((date) => {
          if (date.tableNumber > 0) {
            return `${this.translate.instant('table')} ${date.tableNumber}`;
          }
          return this.translate.instant('break');
        }),
        datasets: [
          {
            label: this.translate.instant('ladies'),
            data: data.dates.map((date) => date.lady?.age),
            borderColor: '#ff6699',
            backgroundColor: '#ff6699'
          },
          {
            label: this.translate.instant('men'),
            data: data.dates.map((date) => date.man?.age),
            borderColor: '#3399ff',
            backgroundColor: '#3399ff'
          },
          {
            label: ageDifferenceLabel,
            data: data.dates.map((date) => {
              if (date.man && date.lady) {
                return Math.abs(date.man.age - date.lady.age);
              }
              return 0;
            }),
            borderColor: '#00cc66',
            backgroundColor: '#00cc66'
          }
        ]
      },
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
                const lady = data.dates[tooltipItem.dataIndex].lady;
                const man = data.dates[tooltipItem.dataIndex].man;
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
                return data.dates[context.dataIndex].lady?.firstName;
              } else if (context.datasetIndex === 1) {
                return data.dates[context.dataIndex].man?.firstName;
              }
              return value;
            }
          },
          title: {
            display: true,
            text: `${this.translate.instant('date')} ${data.dateNumber} / ${
              data.noOfDates
            }`
          }
        },
        scales: {
          y: {
            min: 0,
            max: data.maxAge + 20
          }
        }
      }
    }) as Chart;
  }
}
