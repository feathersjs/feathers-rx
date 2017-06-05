import { sorter as createSorter } from 'feathers-commons/lib/utils';
import { Observable } from 'rxjs/Observable';

export function getSource (__super, args) {
  let result = null;

  return Observable.create(observer => {
    const _observer = observer;

    if (!result) {
      result = __super(...args);
    }

    if (!result || typeof result.then !== 'function' ||
      typeof result.catch !== 'function'
    ) {
      throw new Error(`feathers-reactive only works with services that return a Promise`);
    }

    result.then(res => {
      _observer.next(res);
      _observer.complete();
    })
      .catch(e => _observer.error(e));
  });
}

export function makeSorter (query, options) {
  // The sort function (if $sort is set)
  const sorter = query.$sort ? createSorter(query.$sort) : createSorter({
    [options.idField]: 1
  });

  return function (result) {
    const isPaginated = !!result[options.dataField];
    let data = isPaginated ? result[options.dataField] : result;

    if (sorter) {
      data = data.sort(sorter);
    }

    const limit = typeof result.limit === 'number' ? result.limit : parseInt(query.$limit, 10);

    if (limit && !isNaN(limit)) {
      data = data.slice(0, limit);
    }

    if (isPaginated) {
      result[options.dataField] = data;
    } else {
      result = data;
    }

    return result;
  };
}

export function getOptions (base, ...others) {
  const options = Object.assign({}, base, ...others);

  if (typeof options.listStrategy === 'string') {
    options.listStrategy = options.listStrategies[options.listStrategy];
  }

  return options;
}

export function addObserveOnZoneOperator () {
  // patch Observable prototype
  Observable.prototype.__feathers_observeOnZone = function (zone) {
    return Observable.create(observer => {
      const onNext = (value) => zone.run(() => observer.next(value));
      const onError = (e) => zone.run(() => observer.error(e));
      const onComplete = () => zone.run(() => observer.complete());
      return this.subscribe(onNext, onError, onComplete);
    });
  };
}
