/**
 * Component for implementing an inline-edit capability.
 *
 * Rather than using `contenteditable`, this library instead aims to provide a
 * convenient way to define more structured forms for manipulating the
 * underlying data. It is meant to be highly configurable and extendable.
 *
 * It uses a state-machine (via machina.js) to manage the internals, and uses
 * configurable methods to handle all the other user input and interface.
 *
 *
 * @author Dominic Barnes <dominic@dbarnes.info>
 */

"use strict";

// dependencies
var classes = require("classes");
var domify = require("domify");
var empty = require("empty");
var events = require("events");
var machina = require("machina.js")();
var text = require("text");
var trim = require("trim");
var type = require("type");
var wrap = require("wrap");


// single export
module.exports = machina.Fsm.extend({
    // the methods that may safely be overridden

    /**
     * method for "parsing" the value from an element
     *
     * @param {HTMLElement} el
     * @returns {String}
     */
    parseValue: function (el) {
        return trim(text(el));
    },

    /**
     * method for rendering the value back into the content element
     *
     * @param {String} val
     * @param {HTMLElement} el
     */
    formatValue: function (val, el) {
        text(el, trim(val));
    },

    /**
     * Determines the structure of the <form> element. This can either be a
     * string or a function that returns a string. The default we have here is
     * just a simple string.
     *
     * Requirements:
     *  - it **must** be a form element
     *  - it *should* include a button[type="submit"]
     *  - it *should* include a button.inlineedit-cancel[type="button"]
     */
    generateForm: require("./form.html"),

    /**
     * Determines the structure of the "processing indicator" (often called a
     * "spinner") It can either be a string or a function that returns a string.
     * The default we have here is just a simple string.
     *
     * Requirements:
     *  - it *should* be a block-level element (eg: <div>)
     */
    generateSpinner: require("./spinner.html"),

    /**
     * "populates" the form with whatever value has been parsed
     *
     * @param {String} val
     * @param {HTMLFormElement} form
     */
    prepareForm: function (val, form) {
        var input = form.elements[0];
        input.value = val;
        input.focus();
    },

    /**
     * Processes the form and extracts the values for submission
     *
     * @param {HTMLFormElement} form
     * @returns {String}
     */
    processForm: function (form) {
        return form.elements[0].value;
    },

    /**
     * Handles submitting the processed value. By default this is a no-op and
     * MUST be overridden!
     *
     * @param {String} val
     */
    submitForm: function (val, done) {
        done();
    },


    // core properties and methods use caution when overridding these.
    // See the machina documentation if something is undocumented here

    initialize: function () {
        if (typeof this.element === "string") {
            this.element = document.querySelector(this.element);
        }

        this.container = document.createElement("div");
        this.form = getElement(this.generateForm, this);
        this.spinner = getElement(this.generateSpinner, this);

        this.events = events(this.container, this);

        classes(this.form).add("inlineedit-form");
        classes(this.spinner).add("inlineedit-spinner");

        this.create();
    },

    create: function () {
        this.events.bind("click .inlineedit-content", "proxyEvent");
        this.events.bind("submit .inlineedit-form", "proxyEvent");
        this.events.bind("click .inlineedit-cancel", "proxyEvent", "cancel");

        classes(this.container).add("inlineedit");
        classes(this.element).add("inlineedit-content");

        this.value = this.parseValue(this.element);

        wrap(this.element, this.container);
    },

    destroy: function () {
        this.events.unbind();

        classes(this.element).remove("inlineedit");
        classes(this.element).remove("inlineedit-content");

        this.container.parentNode.replaceChild(this.element, this.container);

        delete this.value;
    },

    initialState: "ready",

    states: {
        ready: {
            _onEnter: function () {
                if (this.element.parentNode !== this.container) {
                    empty(this.container);
                    this.formatValue(this.value, this.element);
                    this.container.appendChild(this.element);
                }
            },
            click: function () {
                this.transition("editing");
            }
        },

        editing: {
            _onEnter: function () {
                empty(this.container);
                this.container.appendChild(this.form);
                this.prepareForm(this.value, this.form);
            },
            cancel: function () {
                this.transition("ready");
            },
            submit: function () {
                this.transition("saving");
            }
        },

        saving: {
            _onEnter: function () {
                var self = this;
                var val = this.processForm(this.form);

                empty(this.container);
                this.container.appendChild(this.spinner);

                this.submitForm(val, function (err) {
                    if (err) {
                        self.handle("error", err);
                    } else {
                        self.value = val;
                        self.handle("success");
                    }
                });
            },
            success: function () {
                this.emit("saved");
                this.transition("ready");
            },
            error: function (err) {
                this.emit("error", err);
                this.transition("editing");
            }
        }
    },

    proxyEvent: function (e, type) {
        e.preventDefault();
        this.handle(type || e.type);
    }
});


// private helpers
function getElement(el, ctx) {
    switch (type(el)) {
    case "element":
        return el;

    case "function":
        return getElement(el.call(ctx), ctx);

    case "string":
        return domify(el);

    default:
        throw new TypeError("string or element required");
    }
}
