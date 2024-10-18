// scroll-animation.directive.ts
import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appScrollAnimation]'
})
export class ScrollAnimationDirective implements OnInit {
  constructor(private el: ElementRef) {}

  ngOnInit() {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.el.nativeElement.classList.add('visible');
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(this.el.nativeElement);
  }
}