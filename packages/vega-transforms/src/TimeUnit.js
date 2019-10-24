import {Transform} from 'vega-dataflow';
import {timeUnits, timeFloor, utcFloor, timeInterval, utcInterval} from 'vega-time';
import {accessorFields, inherits, peek} from 'vega-util';

/**
 * Discretize dates to specific time units.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.field - The data field containing date/time values.
 */
export default function TimeUnit(params) {
  Transform.call(this, null, params);
}

const OUTPUT = ['unit0', 'unit1'];

TimeUnit.Definition = {
  "type": "TimeUnit",
  "metadata": {"modifies": true},
  "params": [
    { "name": "field", "type": "field", "required": true },
    { "name": "unit", "type": "string" },
    { "name": "step", "type": "number", "default": 1 },
    { "name": "timezone", "type": "enum", "default": "local", "values": ["local", "utc"] },
    { "name": "as", "type": "string", "array": true, "length": 2, "default": OUTPUT }
  ]
};

var prototype = inherits(TimeUnit, Transform);

prototype.transform = function(_, pulse) {
  var field = _.field,
      utc = _.timezone === 'utc',
      step = _.step || 1,
      floor = this._floor(_.unit, step, utc),
      offset = (utc ? utcInterval : timeInterval)(floor.unit).offset,
      as = _.as || OUTPUT,
      u0 = as[0],
      u1 = as[1],
      min = floor.start || Infinity,
      max = floor.stop || -Infinity,
      flag = pulse.ADD;

  if (_.modified() || pulse.modified(accessorFields(_.field))) {
    pulse = pulse.reflow(true);
    flag = pulse.SOURCE;
    min = Infinity;
    max = -Infinity;
  }

  pulse.visit(flag, function(t) {
    var v = field(t), a, b;
    if (v == null) {
      t[u0] = null;
      t[u1] = null;
    } else {
      t[u0] = a = floor(v);
      t[u1] = b = offset(a, step);
      if (a < min) min = a;
      if (b > max) max = b;
    }
  });

  floor.start = min;
  floor.stop = max;

  return pulse.modifies(as);
};

prototype._floor = function(units, step, utc) {
  units = timeUnits(units);

  const prev = this.value || {},
        floor = (utc ? utcFloor : timeFloor)(units, step);

  floor.unit = peek(units);
  floor.step = step;
  floor.start = prev.start;
  floor.stop = prev.stop;
  return this.value = floor;
};