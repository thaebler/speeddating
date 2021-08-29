import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Chart, registerables, TooltipItem, TooltipModel } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SeatingOverview, SeatingService } from '../seating.service';

@Component({
  selector: 'app-seating-chart',
  templateUrl: './seating-chart.component.html',
  styleUrls: ['./seating-chart.component.css']
})
export class SeatingChartComponent implements AfterViewInit {
  chart?: Chart;

  @ViewChild('chart')
  canvas!: ElementRef;

  constructor(public seatingService: SeatingService) {}

  ngAfterViewInit() {
    Chart.register(...registerables, ChartDataLabels);
    this.seatingService.state.subscribe((state) => this.renderChart(state));
  }

  onStart(): void {
    this.seatingService.start();
  }

  onRotate(): void {
    this.seatingService.rotate();
  }

  private renderChart(state: SeatingOverview) {
    const ctx = this.canvas.nativeElement.getContext(
      '2d'
    ) as CanvasRenderingContext2D;
    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: state.dates.map((date) => {
          if (date.tableNumber > 0) {
            return 'Table ' + date.tableNumber;
          }
          return 'Break';
        }),
        datasets: [
          {
            label: 'Ladies',
            data: state.dates.map((date) => date.lady?.age),
            borderColor: '#ff6699',
            backgroundColor: '#ff6699'
          },
          {
            label: 'Men',
            data: state.dates.map((date) => date.man?.age),
            borderColor: '#3399ff',
            backgroundColor: '#3399ff'
          },
          {
            label: 'Age Difference',
            data: state.dates.map((date) => {
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
                const lady = state.dates[tooltipItem.dataIndex].lady;
                const man = state.dates[tooltipItem.dataIndex].man;
                if (lady && tooltipItem.datasetIndex === 0) {
                  return `${lady.firstName}: ${lady.age}`;
                } else if (man && tooltipItem.datasetIndex === 1) {
                  return `${man.firstName}: ${man.age}`;
                } else if (lady && man && tooltipItem.datasetIndex === 2) {
                  const dataset =
                    this.dataPoints[tooltipItem.datasetIndex].dataset.data;
                  return `Age difference: ${dataset[tooltipItem.dataIndex]}`;
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
                return state.dates[context.dataIndex].lady?.firstName;
              } else if (context.datasetIndex === 1) {
                return state.dates[context.dataIndex].man?.firstName;
              }
              return value;
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: state.maxAge + 20
          }
        }
      }
    }) as Chart;
  }
}
