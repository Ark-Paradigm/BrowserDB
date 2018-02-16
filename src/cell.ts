type change_callback = {
    (newvalue: any, oldvalue: any): void
};

/**
 * A Cell is the smallest unit of data in the database. A [[Row]] is made of
 * one or more cells and a [[Table]] is made of one or more rows.
 *
 * The value of a cell is stored in its value property. A cell can hold any
 * type of value in its value property except for unique cells which must hold
 * either numbers or strings.
 */
export class Cell {

    /**
     * Holds whether the value of this cell is nullable. This is set to true by
     * default
     */
    private _nullable: boolean;

    /**
     * Holds the value of the cell. This can be of any type so long as the cell
     * does not have the [[_is_unique]] flag set to true. If the cell is an
     * unique cell then the value must be of type string or number
     */
    private _value: any;

    /**
     * True if the value of the cell has been changed but not yet written false
     * otherwise.
     *
     * @note: It is possible to change the value of the cell without setting the
     *        _is_dirty flag to true by using the [[fix_value]] function.
     */
    private _is_dirty: boolean = false;

    /**
     * Stores whether or not this cell is unique. Unique cells may only
     * store values that are strings or numbers. This is false by default
     */
    private _is_unique: boolean;

    /**
     * Contains the list of callbacks that will be run if the value of this
     * cell is changed
     */
    private _change_callbacks: [change_callback, any][] = [];

    /**
     * Creates an instance of [[Cell]].
     */
    constructor({ is_unique = false, nullable = true }: { is_unique?: boolean, nullable?: boolean } = {}) {
        if (typeof is_unique !== 'boolean') {
            throw new Error(
                "Argument of type '" + typeof is_unique + "' is not " +
                "assignable to is_unique"
            );
        }
        if (typeof nullable !== 'boolean') {
            throw new Error(
                "Argument of type '" + typeof nullable + "' is not " +
                "assignable to nullable"
            );
        }
        this._is_unique = is_unique;
        this._nullable = nullable;
    }

    /**
     * Returns true if the value of the cell has been changed since the last
     * write event and false otherwise
     */
    public get is_dirty(): boolean {
        return this._is_dirty;
    }

    /**
     * Sets the [[is_dirty]] property to false.
     */
    public written() {
        this._is_dirty = false;
    }


    /**
     * Returns true if this cell is unique. Unique cells must only
     * hold number or string values and the value must be unique in their table
     */
    public get is_unique() {
        return this._is_unique;
    }

    /**
     * Returns the value stored in this cell.
     */
    public get value(): any {
        return this._value;
    }

    /**
     * Sets the value of this cell and sets the [[is_dirty]] flag to true.
     *
     */
    public set value(v: any) {
        if (v !== this._value) {
            this.sanitize_incoming_value(v);
            this._is_dirty = true;
            let oldvalue = this._value;
            this._value = v;
            this._run_callbacks(oldvalue);
        }
    }

    /**
     * Will set the value of the cell without setting the dirty flag to true.
     * This is useful for initialising the cell or if the change does not need
     * to be written.
     */
    public fix_value(v: any): void {
        if (v !== this._value) {
            this.sanitize_incoming_value(v);
            let oldvalue = this._value;
            this._value = v;
            this._run_callbacks(oldvalue);
        }
    }

    /**
     * This function adds the given callback to the list of callbacks that are
     * run when this cell's value is changed. It returns the _remove_callback
     * function to remove the given callback if it is not needed anymore
     */
    public register_change(callback: change_callback, context: any = undefined): () => void {
        this._change_callbacks.push([callback, context]);
        return this._remove_callback(callback);
    }

    /** Return is a function that can
     * be called to remove the given callback from the list
     */
    private _remove_callback(callback: change_callback): () => void {
        return (() => {
            for (let index = 0; index < this._change_callbacks.length; index++) {
                const element = this._change_callbacks[index];
                if (element[0] === callback) {
                    this._change_callbacks.splice(index, 1);
                    break;
                }
            }
        });
    }

    /**
     * Runs all the callbacks in the [[_change_callbacks]] list
     */
    private _run_callbacks(oldvalue: any): void {
        this._change_callbacks.forEach(element => {
            let callback = element[0];
            callback.call(element[1], this._value, oldvalue);
        });
    }

    /**
     * Makes sure incoming values don't break any rules
     */
    private sanitize_incoming_value(v: any) {
        //do not set back to undefined
        if (v === undefined) {
            throw new Error("Must not set value of cell to undefined");
        }

        if (v === null && !this._nullable) {
            throw new Error("Can not set value of non-nullable cell to null");
        }

        //not changing types unless setting to null
        if (this._value !== undefined && typeof v !== typeof this._value && v !== null) {
            throw new Error("Must not change type of cell");
        }

        //not setting unique values to non string|numbers
        if (this.is_unique) {
            if (typeof v !== 'string' && typeof v !== 'number') {
                throw new Error(
                    "An unique cell may only contain values of type " +
                    "'string' or 'number'"
                );
            }
        }
    }
}