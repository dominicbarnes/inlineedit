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
     * Determines the structure of the <form> element.
     *
     * (see normalizeElement for possible values this property can take)
     *
     * Requirements:
     *  - it **must** be a form element
     *  - it *should* include a button[type="submit"]
     *  - it *should* include a button.inlineedit-cancel[type="button"]
     */
    formElement: require("./form.html"),

    /**
     * Determines the structure for the editing interface. (later, the results
     * of this will be merged into the form via prepareForm)
     *
     * (see normalizeElement for possible values this property can take)
     */
    interfaceElement: require("./interface.html"),

    /**
     * Determines the structure of the "processing indicator" (often called a
     * "spinner")
     *
     * (see normalizeElement for possible values this property can take)
     *
     * Requirements:
     *  - it *should* be a block-level element (eg: <div>)
     */
    spinnerElement: require("./spinner.html"),

    /**
     * Combines the results of formElement and interfaceElement into a
     * complete UI for the user. This hook can also be used to add any other
     * components or event-handlers.
     *
     * The default here is to prepend a single interface element to the form.
     *
     * This will be run **once** during init. (use populateForm to perform init
     * each time editing mode is enabled)
     *
     * @param {HTMLElement} input
     * @param {HTMLFormElement} form
     */
    prepareForm: function (input, form) {
        form.insertBefore(input, form.firstChild);
    },

    /**
     * Whenever the component enters editing mode, this function will be run to
     * populate the form with the correct values.
     *
     * @param {String} val
     * @param {HTMLFormElement} form
     */
    populateForm: function (val, form) {
        var input = form.elements.item(0);
        input.value = val;
        input.focus();
    },

    /**
     * When the form is submitted, this function will be used to convert the
     * element values into a meaningful value for your application.
     *
     * @param {HTMLFormElement} form
     * @returns {String}
     */
    processForm: function (form) {
        return form.elements.item(0).value;
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


    // these methods/properties largely don't need modification, unless you
    // know exactly what you are doing

    /**
     * Binds events and modifies the relevant DOM elements. (this can be run
     * more than once per instance, but only if/after destroy has been called
     * first)
     */
    create: function () {
        this.events.bind("click .inlineedit-content", "proxyEvent");
        this.events.bind("submit .inlineedit-form", "proxyEvent");
        this.events.bind("click .inlineedit-cancel", "proxyEvent", "cancel");

        classes(this.container).add("inlineedit");
        classes(this.element).add("inlineedit-content");

        this.value = this.parseValue(this.element);

        wrap(this.element, this.container);
    },

    /**
     * The reverse of create, removes events and restores the source element
     * back to it's original state.
     */
    destroy: function () {
        this.events.unbind();

        classes(this.element).remove("inlineedit");
        classes(this.element).remove("inlineedit-content");

        this.container.parentNode.replaceChild(this.element, this.container);

        delete this.value;
    },

    /**
     * Helper method for proxying a DOM event into machina.Fsm#handle. If type
     * is passed, it will take precedence over e.type
     *
     * @param {Event} e
     * @param {String} [type]
     */
    proxyEvent: function (e, type) {
        e.preventDefault();
        this.handle(type || e.type);
    },

    /**
     * This method "normalizes" the input to become a DOM element according to
     * the following specs:
     *
     *  - when `HTMLElement`, return the reference
     *  - when `String`, run through domify and return
     *  - when `Function`, invoke it and proxy the results back in
     *
     * @param {String|HTMLElement|Function} el
     */
    normalizeElement: function (el) {
        switch (type(el)) {
        case "element":
            return el;

        case "string":
            return domify(el);

        case "function":
            return this.normalizeElement(el.call(this));

        default:
            throw new TypeError("string or element required");
        }
    },

    /**
     * Empties the container element and appends the element specified (meant
     * to keep only 1 interface visible at a time)
     *
     * @param {HTMLElement} el
     */
    showElement: function (el) {
        empty(this.container);
        this.container.appendChild(el);
    },


    // machina.js configuration

    /**
     * This function runs **once** for each instance, and it handles preparing
     * the instance for use.
     */
    initialize: function () {
        if (typeof this.element === "string") {
            this.element = document.querySelector(this.element);
        }

        this.container = document.createElement("div");
        this.form = this.normalizeElement(this.formElement);
        this.interface = this.normalizeElement(this.interfaceElement);
        this.spinner = this.normalizeElement(this.spinnerElement);

        this.prepareForm(this.interface, this.form);

        this.events = events(this.container, this);

        classes(this.form).add("inlineedit-form");
        classes(this.spinner).add("inlineedit-spinner");

        this.create();
    },

    /**
     * This determines where in the lifecycle the FSM will be after init.
     * Typically, this is only overridden for things like testing, but I'm sure
     * there are other clever uses for this. (like defaulting to "editing" for
     * specific interfaces in certain conditions)
     */
    initialState: "ready",

    states: {
        ready: {
            _onEnter: function () {
                if (this.element.parentNode !== this.container) {
                    this.showElement(this.element);
                    this.formatValue(this.value, this.element);
                }
            },
            click: function () {
                this.transition("editing");
            }
        },

        editing: {
            _onEnter: function () {
                this.showElement(this.form);
                this.populateForm(this.value, this.form);
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

                this.showElement(this.spinner);

                this.submitForm(val, function (err, newVal) {
                    if (err) {
                        self.handle("error", err);
                    } else {
                        self.handle("success", typeof newVal !== "undefined" ? newVal : val);
                    }
                });
            },
            success: function (val) {
                this.value = val;
                this.emit("saved");
                this.transition("ready");
            },
            error: function (err) {
                this.emit("error", err);
                this.transition("editing");
            }
        }
    },
});
