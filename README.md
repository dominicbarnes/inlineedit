inlineedit
==========

A base component for creating inlineedit interfaces for your application.

Instead, a single element can represent 1 or more different fields. On `click`,
the element will be replaced with a `<form>` corresponding to those various
fields of information. Once the user finishes making their changes, an AJAX
request can be issued to persist that change. Afterwards, the `<form>` is
replaced by the source element whose contents are updated to reflect whatever
change the user made.

This component is merely a base, and it only affords a single text field for
editing an element. Via a Backbone-style `extend` mechanism, you can create new
constructors to behave as your particular use-case demands.

Each instance is a Finite State Machine (via
[machina.js](http://github.com/ifandelse/machina.js)) at it's core. However,
you don't need to understand those internals at all in order to use this
component.

## Usage:

```html
<h1 id="page-title">Hello World</h1>
```

```javascript
var InlineEdit = require("inlineedit");

var instance = new InlineEdit({
    element: "#page-title",
    submitForm: function (value, done) {
        // perform AJAX and save this value to your database
        // issue the callback w/ an `err` param (node-style) upon failure
    }
});
```

## Configuration Options

Any of the properties/methods below can be overridden safely either during
initialization (`new InlineEdit({ ... });`) or during an `extend` operation.
(`var MyInlineEdit = InlineEdit.extend({ ... });`)

### parseValue(el)

This method is responsible for taking the root element (`el`) and parsing it's
contents into a single value. (or object of values)

The default behavior is to take the text contents of the element,
[trim](http://github.com/component/trim) it and return a single `String`.

### formatValue(val, el)

This method is the "inverse" of `parseValue`, it takes the value set by the
form (see the `processForm` for more details) and modifies the element `el`
to reflect that new value.

The default behavior is to take `val`, trim it and set that `String` as the
text content of the element. (`el`)

### generateForm() / generateForm

This property/method is responsible for constructing the `<form>` that will
take the user's input.

It can take several forms. If it is a `String`, then it is run through
[domify](http://github.com/component/domify). If it is a `Function`, then that
function is run and the results are passed back into `generateForm`. Lastly,
if it is a `HTMLElement`, it will use that element reference directly.

The generated element should meet the following criteria: (I've tried to keep
this list as minimal as possible)

 * it **must** be a `<form>` element
 * it *should* include a "submit" button (button w/ `type="submit"`)
 * it *should* include a "cancel" button (button w/ class `.inlineedit-cancel`)

The default is the `String` contents of `form.html`.

### generateSpinner() / generateSpinner

This property/method is responsible for constructing the element that will be
displayed to the user while the submission is being processed.
(see `generateForm` for the possible forms this property can take)

The generated element should meet the following criteria:

 * it *should* be a block-level element (eg: `<div>`)

The default is the `String` contents of `spinner.html`

### prepareForm(val, form)

This method takes the adjust the input element(s) of `form` (see `generateForm`)
and sets their value(s) to reflect `val`. (see `parseValue`) It is run each time
the user activates the form by clicking on the root element.

The default behavior is to set `form.elements[0].value = val;`. (in other words,
sets the first input's value)

### processForm(form)

This method takes the `form` and processes the element(s) it contains and turns
that into a single value.

The default behavior is to return `form.elements[0].value`.

### submitForm(val, done)

This method is responsible for taking `val` (see `processForm`) and persisting
the change to your application. (such as via AJAX) It receives a `done` callback
which is to be called upon with an optional `err` param upon completion.

The default behavior is a "no-op", as such this will **need** to be overridden
by the developer.
