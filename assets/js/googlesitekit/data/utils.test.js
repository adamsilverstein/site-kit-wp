/**
 * Internal dependencies
 */
import {
	collect,
	collectActions,
	collectReducers,
	initializeAction,
} from './utils';

describe( 'data utils', () => {
	describe( 'collect()', () => {
		it( 'should collect multiple objects and combine them into one', () => {
			const objectOne = {
				bar: () => {},
				foo: () => {},
			};
			const objectTwo = {
				cat: () => {},
				dog: () => {},
			};

			expect( collect( objectOne, objectTwo ) ).toEqual( {
				...objectOne,
				...objectTwo,
			} );
		} );

		it( 'should accept as many objects as supplied', () => {
			const objectOne = {
				bar: () => {},
				foo: () => {},
			};
			const objectTwo = {
				cat: () => {},
				dog: () => {},
			};
			const objectThree = {
				feline: () => {},
				wolf: () => {},
			};
			const objectFour = {
				mouse: () => {},
				rat: () => {},
			};
			const objectFive = {
				horse: () => {},
				unicorn: () => {},
			};

			expect( collect(
				objectOne,
				objectTwo,
				objectThree,
				objectFour,
				objectFive
			) ).toEqual( {
				...objectOne,
				...objectTwo,
				...objectThree,
				...objectFour,
				...objectFive,
			} );
		} );

		it( 'should error if objects have the same key', () => {
			// This can lead to subtle/hard-to-detect errors, so we check for it
			// whenever combining store actions, selectors, etc.
			// See: https://github.com/google/site-kit-wp/pull/1162/files#r385912255
			const objectOne = {
				cat: () => {},
				feline: () => {},
				mouse: () => {},
			};
			const objectTwo = {
				cat: () => {},
				feline: () => {},
				dog: () => {},
			};

			expect( () => {
				collect( objectOne, objectTwo );
			} ).toThrow( /Your call to collect\(\) contains the following duplicated functions: cat, feline./ );
		} );
	} );

	describe( 'collectActions()', () => {
		it( 'should collect multiple actions and combine them into one object', () => {
			const objectOne = {
				bar: () => {},
				foo: () => {},
			};
			const objectTwo = {
				cat: () => {},
				dog: () => {},
			};

			expect( collectActions( objectOne, objectTwo ) ).toMatchObject( {
				...objectOne,
				...objectTwo,
			} );
		} );

		it( 'should include an initialize action that dispatches an INITIALIZE action type', () => {
			const objectOne = {
				bar: () => {},
				foo: () => {},
			};
			const objectTwo = {
				cat: () => {},
				dog: () => {},
			};

			expect( collectActions( objectOne, objectTwo ) ).toMatchObject( {
				initialize: initializeAction,
			} );
		} );
	} );

	describe( 'collectReducers()', () => {
		it( 'should respond to an INITIALIZE action because it extends the reducers to include one', () => {
			const reducer = ( state, action ) => {
				switch ( action.type ) {
					default: {
						return { ...state };
					}
				}
			};
			const initialState = { count: 0 };
			const combinedReducer = collectReducers( initialState, [ reducer ] );

			let state = combinedReducer();
			expect( state ).toEqual( { count: 0 } );

			// Normally we'd be dispatching an action to change state, but for our
			// testing purposes this is fine 😅
			state.count = 5;
			expect( state ).toEqual( { count: 5 } );

			state = combinedReducer( state, initializeAction() );

			expect( state ).toEqual( { count: 0 } );
		} );
	} );
} );
