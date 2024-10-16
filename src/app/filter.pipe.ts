import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {

  transform(items: any[], searchQuery: string): any[] {
    if (!items || !searchQuery) {
      return items;
    }

    return items.filter(item =>
      item.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
}
